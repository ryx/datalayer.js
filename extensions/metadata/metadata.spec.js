/* eslint-disable max-len, no-new */
import { describe, it, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import td from 'testdouble';
import { JSDOM } from 'jsdom';

// stub dependencies

describe('metadata', () => {
  let [metadata, datalayerMock, dom, window] = [];

  beforeEach(() => {
    dom = new JSDOM(`<!DOCTYPE html><html data-unique="${Math.random() * 100}"><body></body></html>`);
    window = td.replace('../../src/lib/window', dom.window);
    datalayerMock = {
      broadcast: td.function(),
    };
    return import('./metadata.js').then((m) => {
      metadata = m;
    });
  });

  afterEach(() => {
    window.close();
    dom = null;
  });

  describe('module:', () => {
    it('should export a factory which returns the extension class', () => {
      assert.isFunction(metadata.default());
    });
  });

  describe('extension factory:', () => {
    it('should collect, aggregate and return "dtlr:data" metatags when calling "beforeInitialize"', () => {
      const ExtensionClass = metadata.default();
      const data = { data: { foo: 'bar', numberProp2: 42 } };
      window.document.querySelector('body').innerHTML = `<meta name="dtlr:data" content='${JSON.stringify(data)}' />`;

      const extension = new ExtensionClass(datalayerMock);

      assert.deepEqual(extension.beforeInitialize(), data);
    });

    it('should broadcast events found in "dtlr:event" metatags when calling "beforeParseDOMNode"', () => {
      const ExtensionClass = metadata.default();
      const eventData = { name: 'my-event', data: { foo: 'bar', numberProp2: 42 } };
      window.document.querySelector('body').innerHTML = `<meta name="dtlr:event" content='${JSON.stringify(eventData)}' />`;
      const extension = new ExtensionClass(datalayerMock);

      extension.beforeParseDOMNode(window.document);

      td.verify(datalayerMock.broadcast(eventData.name, eventData.data));
    });
  });

  describe('collectMetadata:', () => {
    it('should return an object with an aggregation of all provided metatags\' data', () => {
      const data = { stringProp: 'hello', numberProp: 42, numberProp2: 76.54 };
      window.document.querySelector('body').innerHTML = `<meta name="dal:data" content='${JSON.stringify(data)}' />`;

      assert.deepEqual(
        metadata.collectMetadata('dal:data', () => {}),
        data,
        'collected metadata is equal to original data'
      );
    });

    it('should accept a different parent context as argument and collect metatags only within that element', () => {
      const data = { outerProp: 'foo' };
      const innerData = { innerProp: 'bar' };
      window.document.querySelector('body').innerHTML =
        `<meta name="dal:data" content='${JSON.stringify(data)}' />` +
        `<div id="data-container"><meta name="dal:data" content='${JSON.stringify(innerData)}' /></div>`;

      assert.deepEqual(
        metadata.collectMetadata('dal:data', () => {}, '#data-container'),
        innerData,
        'collected metadata contains only inner data'
      );
    });

    it('should return false if context cannot be found', () => {
      assert.isFalse(metadata.collectMetadata('dal:data', () => {}, '#non-existent'));
    });

    it('should fire a callback for each collected metatag and pass element and JSON.parse\'d content', () => {
      const collectedData = [];
      window.document.querySelector('body').innerHTML =
        '<meta name="dal:data" content=\'{"foo":"bar"}\' />' +
        '<meta name="dal:data" content=\'{"foo":"bar"}\' />' +
        '<meta name="dal:data" content=\'{"foo":"bar"}\' />';

      metadata.collectMetadata('dal:data', (err, element, content) => collectedData.push(content));

      assert.deepEqual(
        collectedData,
        [{ foo: 'bar' }, { foo: 'bar' }, { foo: 'bar' }],
        'should contain the parsed JSON from the metatags as array',
      );
    });

    it('should return an object with an aggregation of all provided metatags\' data', () => {
      window.document.querySelector('body').innerHTML =
        '<meta name="dal:data" content=\'{"string1":"hello","number1":42}\' />' +
        '<meta name="dal:data" content=\'{"string2":"foo","number2":76}\' />' +
        '<meta name="dal:data" content=\'{"string3":"bar","number3":777}\' />';

      assert.deepEqual(
        metadata.collectMetadata('dal:data', () => {}),
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
    });
  });

  describe('extend:', () => {
    it('should extend a given flat object with another flat object, overriding existing props', () => {
      assert.deepEqual(
        metadata.extend({
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
        }
      );
    });

    it('should deep-extend a given flat object with a nested object', () => {
      assert.deepEqual(
        metadata.extend({
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
        }
      );
    });

    it('should deep-extend a given nested object with another nested object and deep-overwrite members', () => {
      assert.deepEqual(
        metadata.extend({
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
      );
    });
  });
});
