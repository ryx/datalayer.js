/* eslint-disable max-len */
import { JSDOM } from 'jsdom';

const {
  describe,
  it,
  beforeEach,
  expect,
} = global;

// stub dependencies
const dom = new JSDOM('<!DOCTYPE html>');
global.window = dom.window;
global.document = window.document;

describe('utils', () => {
  let [utils] = [];

  beforeEach(() => import('./utils').then((m) => { utils = m.default; }));

  describe('method queue:', () => {
    const setupMQP = () => {
      const contextObj = { _testq: [] };
      const apiObj = {
        method1: jest.fn(),
        method2: jest.fn(),
      };
      return { contextObj, apiObj };
    };

    it('should create a new method queue within the given context', () => {
      const { contextObj, apiObj } = setupMQP();

      delete contextObj._testq;
      utils.createMethodQueueHandler(contextObj, '_testq', apiObj);

      expect(contextObj._testq).toBeDefined();
      expect(typeof contextObj._testq.push).toBe('function');
    });

    it('should use an existing method queue within the given context', () => {
      const { contextObj, apiObj } = setupMQP();

      utils.createMethodQueueHandler(contextObj, '_testq', apiObj);

      expect(contextObj._testq).toBeDefined();
      expect(typeof contextObj._testq.push).toBe('function');
    });

    it('should recognize and execute methods that have been added BEFORE initialization', () => {
      const { contextObj, apiObj } = setupMQP();
      contextObj._testq.push(['method1', 123, 'foo']);
      contextObj._testq.push(['method2', { data: 'test' }]);

      utils.createMethodQueueHandler(contextObj, '_testq', apiObj);

      expect(apiObj.method1).toHaveBeenCalledWith(123, 'foo');
      expect(apiObj.method2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should recognize and execute methods that have been added AFTER initialization', () => {
      const { contextObj, apiObj } = setupMQP();
      utils.createMethodQueueHandler(contextObj, '_testq', apiObj);

      contextObj._testq.push(['method1', 123, 'foo']);
      contextObj._testq.push(['method2', { data: 'test' }]);

      expect(apiObj.method1).toHaveBeenCalledWith(123, 'foo');
      expect(apiObj.method2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should throw an error on methods that are not available in API object', () => {
      const { contextObj, apiObj } = setupMQP();

      expect(() => {
        utils.createMethodQueueHandler(contextObj, '_testq', apiObj);
        contextObj._testq.push(['kaboom', 'bazinga!']);
      }).toThrow(/method "kaboom" not found/gi);
    });
  });

  describe('collectMetadata:', () => {
    it('should return an object with an aggregation of all provided metatags\' data', () => {
      const data = { stringProp: 'hello', numberProp: 42, numberProp2: 76.54 };
      window.document.querySelector('body').innerHTML = `<meta name="dal:data" content='${JSON.stringify(data)}' />`;

      expect(utils.collectMetadata('dal:data', () => {})).toEqual(data);
    });

    it('should accept a different parent context as argument and collect metatags only within that element', () => {
      const data = { outerProp: 'foo' };
      const innerData = { innerProp: 'bar' };
      window.document.querySelector('body').innerHTML =
        `<meta name="dal:data" content='${JSON.stringify(data)}' />` +
        `<div id="data-container"><meta name="dal:data" content='${JSON.stringify(innerData)}' /></div>`;

      expect(utils.collectMetadata('dal:data', () => {}, '#data-container')).toEqual(innerData);
    });

    it('should return false if context cannot be found', () => {
      expect(utils.collectMetadata('dal:data', () => {}, '#non-existent')).toBe(false);
    });

    it('should fire a callback for each collected metatag and pass element and JSON.parse\'d content', () => {
      const collectedData = [];
      window.document.querySelector('body').innerHTML =
        '<meta name="dal:data" content=\'{"foo":"bar"}\' />' +
        '<meta name="dal:data" content=\'{"foo":"bar"}\' />' +
        '<meta name="dal:data" content=\'{"foo":"bar"}\' />';

      utils.collectMetadata('dal:data', (err, element, content) => collectedData.push(content));

      expect(collectedData).toEqual([{ foo: 'bar' }, { foo: 'bar' }, { foo: 'bar' }]);
    });

    it('should return an object with an aggregation of all provided metatags\' data', () => {
      window.document.querySelector('body').innerHTML =
        '<meta name="dal:data" content=\'{"string1":"hello","number1":42}\' />' +
        '<meta name="dal:data" content=\'{"string2":"foo","number2":76}\' />' +
        '<meta name="dal:data" content=\'{"string3":"bar","number3":777}\' />';

      expect(utils.collectMetadata('dal:data', () => {})).toEqual({
        string1: 'hello',
        number1: 42,
        number2: 76,
        string2: 'foo',
        number3: 777,
        string3: 'bar',
      });
    });
  });

  describe('extend:', () => {
    it('should extend a given flat object with another flat object, overriding existing props', () => {
      const result = utils.extend({
        prop1: 'val1',
        prop2: 42,
        prop3: true,
        prop4: 20.16,
        prop5: null,
      }, {
        prop4: 77.123,
        propNew1: 'newVal1',
        propNew2: 71,
      });

      expect(result).toEqual({
        prop1: 'val1',
        prop2: 42,
        prop3: true,
        prop4: 77.123,
        prop5: null,
        propNew1: 'newVal1',
        propNew2: 71,
      });
    });

    it('should deep-extend a given flat object with a nested object', () => {
      const result = utils.extend({
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
          propNewDeep5: null,
        },
        propArray: [
          1, 2, 3, 4,
        ],
      });

      expect(result).toEqual({
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
          propNewDeep5: null,
        },
        propArray: [
          1, 2, 3, 4,
        ],
      });
    });

    it('should deep-extend a given nested object with another nested object and deep-overwrite members', () => {
      const result = utils.extend({
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
      });

      expect(result).toEqual({
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
      });
    });
  });
});
