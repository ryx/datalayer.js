/* eslint-disable max-len */
import { test } from 'tap';
import td from 'testdouble';
import { JSDOM } from 'jsdom';

// stub dependencies
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const window = td.replace('./window', dom.window);

import('./utils').then((module) => {
  const utils = module.default;

  test('method queue:', (t) => {
    const setupMQP = () => {
      const contextObj = { _testq: [] };
      const apiObj = {
        method1: td.function('method1'),
        method2: td.function('method2'),
      };
      return { contextObj, apiObj };
    };

    t.test('should create a new method queue within the given context', (st) => {
      const { contextObj, apiObj } = setupMQP();

      delete contextObj._testq;
      utils.createMethodQueueHandler(contextObj, '_testq', apiObj);

      st.ok(typeof contextObj._testq !== 'undefined', 'method queue is defined');
      st.ok(typeof contextObj._testq.push === 'function', 'push method exists');
      st.end();
    });

    t.test('should use an existing method queue within the given context', (st) => {
      const { contextObj, apiObj } = setupMQP();

      utils.createMethodQueueHandler(contextObj, '_testq', apiObj);

      st.ok(typeof contextObj._testq !== 'undefined', 'method queue is defined');
      st.ok(typeof contextObj._testq.push === 'function', 'push method exists');
      st.end();
    });

    t.test('should recognize and execute methods that have been added BEFORE initialization', (st) => {
      const { contextObj, apiObj } = setupMQP();

      contextObj._testq.push(['method1', 123, 'foo']);
      contextObj._testq.push(['method2', { data: 'test' }]);
      utils.createMethodQueueHandler(contextObj, '_testq', apiObj);

      td.verify(apiObj.method1(123, 'foo'));
      td.verify(apiObj.method2({ data: 'test' }));
      t.pass('API methods have been called');
      st.end();
    });

    t.test('should recognize and execute methods that have been added AFTER initialization', (st) => {
      const { contextObj, apiObj } = setupMQP();
      utils.createMethodQueueHandler(contextObj, '_testq', apiObj);
      contextObj._testq.push(['method1', 123, 'foo']);
      contextObj._testq.push(['method2', { data: 'test' }]);

      td.verify(apiObj.method1(123, 'foo'));
      td.verify(apiObj.method2({ data: 'test' }));
      t.pass('API methods have been called');

      st.end();
    });

    t.test('should throw an error on methods that are not available in API object', (st) => {
      const { contextObj, apiObj } = setupMQP();

      st.throws(
        () => {
          utils.createMethodQueueHandler(contextObj, '_testq', apiObj);
          contextObj._testq.push(['kaboom', 'bazinga!']);
        },
        /method "kaboom" not found/gi,
        'should throw error on missing method'
      );

      st.end();
    });

    t.end();
  });

  test('collectMetadata:', (t) => {
    t.test('should return an object with an aggregation of all provided metatags\' data', (st) => {
      const data = { stringProp: 'hello', numberProp: 42, numberProp2: 76.54 };
      window.document.querySelector('body').innerHTML = `<meta name="dal:data" content='${JSON.stringify(data)}' />`;

      st.deepEqual(
        utils.collectMetadata('dal:data', () => {}),
        data,
        'collected metadata is equal to original data'
      );
      st.end();
    });

    t.test('should accept a different parent context as argument and collect metatags only within that element', (st) => {
      const data = { outerProp: 'foo' };
      const innerData = { innerProp: 'bar' };
      window.document.querySelector('body').innerHTML =
        `<meta name="dal:data" content='${JSON.stringify(data)}' />` +
        `<div id="data-container"><meta name="dal:data" content='${JSON.stringify(innerData)}' /></div>`;

      st.deepEqual(
        utils.collectMetadata('dal:data', () => {}, '#data-container'),
        innerData,
        'collected metadata contains only inner data'
      );
      st.end();
    });

    t.notOk(
      utils.collectMetadata('dal:data', () => {}, '#non-existent'),
      'return false if context cannot be found',
    );

    t.test('should fire a callback for each collected metatag and pass element and JSON.parse\'d content', (st) => {
      const collectedData = [];
      window.document.querySelector('body').innerHTML =
        '<meta name="dal:data" content=\'{"foo":"bar"}\' />' +
        '<meta name="dal:data" content=\'{"foo":"bar"}\' />' +
        '<meta name="dal:data" content=\'{"foo":"bar"}\' />';

      utils.collectMetadata('dal:data', (err, element, content) => collectedData.push(content));

      st.deepEqual(
        collectedData,
        [{ foo: 'bar' }, { foo: 'bar' }, { foo: 'bar' }],
        'should contain the parsed JSON from the metatags as array',
      );
      st.end();
    });

    t.test('should return an object with an aggregation of all provided metatags\' data', (st) => {
      window.document.querySelector('body').innerHTML =
        '<meta name="dal:data" content=\'{"string1":"hello","number1":42}\' />' +
        '<meta name="dal:data" content=\'{"string2":"foo","number2":76}\' />' +
        '<meta name="dal:data" content=\'{"string3":"bar","number3":777}\' />';

      t.deepEqual(
        utils.collectMetadata('dal:data', () => {}),
        {
          string1: 'hello',
          number1: 42,
          number2: 76,
          string2: 'foo',
          number3: 777,
          string3: 'bar',
        },
        'should contain the aggregated data',
      );
      st.end();
    });

    t.end();
  });

  test('extend:', (t) => {
    t.plan(3);

    t.deepEqual(
      utils.extend({
        prop1: 'val1',
        prop2: 42,
        prop3: true,
        prop4: 20.16,
      }, {
        prop4: 77.123,
        propNew1: 'newVal1',
        propNew2: 71,
      }),
      {
        prop1: 'val1',
        prop2: 42,
        prop3: true,
        prop4: 77.123,
        propNew1: 'newVal1',
        propNew2: 71,
      },
      'should extend a given flat object with another flat object, overriding existing props',
    );

    t.deepEqual(
      utils.extend({
        prop1: 'val1',
        prop2: 42,
        prop3: true,
        prop4: 20.16,
      }, {
        prop4: 77.123,
        propNew1: 'newVal1',
        propNew2: {
          propNewDeep1: 'newDeepVal1',
          propNewDeep2: 42,
          propNewDeep3: true,
          propNewDeep4: 20.16,
        },
        propArray: [
          1, 2, 3, 4,
        ],
      }),
      {
        prop1: 'val1',
        prop2: 42,
        prop3: true,
        prop4: 77.123,
        propNew1: 'newVal1',
        propNew2: {
          propNewDeep1: 'newDeepVal1',
          propNewDeep2: 42,
          propNewDeep3: true,
          propNewDeep4: 20.16,
        },
        propArray: [
          1, 2, 3, 4,
        ],
      },
      'should deep-extend a given flat object with a nested object',
    );

    t.deepEqual(
      utils.extend({
        prop1: 'val1',
        prop2: {
          propDeep1: 'deepVal1',
          propDeep2: 42,
          propDeep3: true,
          propDeep4: {
            propDeeper1: 'deeperVal1',
            propDeeper2: 777,
            propDeeper3: 'I will survive',
            propDeepArray: [],
            propDeepArrayWithObjectMembers: [
              { foo: 'bar' },
            ],
          },
        },
        prop3: 'lone survivor',
      }, {
        prop1: 'newVal1',
        prop2: {
          propDeep1: 'newDeepVal1',
          propDeep2: 84,
          propDeep3: false,
          propDeep4: {
            propDeeper1: 'newDeeperVal1',
            propDeeper2: 888,
            propDeepArrayWithObjectMembers: [
              { foo2: 'bar2' },
            ],
          },
        },
      }),
      {
        prop1: 'newVal1',
        prop2: {
          propDeep1: 'newDeepVal1',
          propDeep2: 84,
          propDeep3: false,
          propDeep4: {
            propDeeper1: 'newDeeperVal1',
            propDeeper2: 888,
            propDeeper3: 'I will survive',
            propDeepArray: [],
            propDeepArrayWithObjectMembers: [
              { foo2: 'bar2' },
            ],
          },
        },
        prop3: 'lone survivor',
      },
      'should deep-extend a given nested object with another nested object and deep-overwrite members',
    );

    t.end();
  });

  td.reset();
});
