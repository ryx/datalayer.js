/* eslint-disable max-len, no-new */
import { describe, it, beforeEach } from 'mocha';
import { assert } from 'chai';
import td from 'testdouble';
import { JSDOM } from 'jsdom';

// stub dependencies
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const window = td.replace('../../src/lib/window', dom.window);

describe('methodQueue', () => {
  let [methodQueue, datalayerMock] = [];

  beforeEach(() => import('./methodQueue.js').then((m) => {
    methodQueue = m;
    datalayerMock = {
      broadcast: td.function(),
    };
  }));

  describe('methodQueue extension:', () => {
    it('should export a factory which returns the extension class', () => {
      assert.isFunction(methodQueue.default());
    });

    it('should install a global method queue with the default name', () => {
      const ExtensionClass = methodQueue.default();

      new ExtensionClass(datalayerMock);

      assert.isObject(window._dtlrq);
    });

    it('should install a global method queue with a custom name if provided in config', () => {
      const ExtensionClass = methodQueue.default({ queueName: '_myqueue' });

      new ExtensionClass(datalayerMock);

      assert.isObject(window._myqueue);
    });
  });

  describe('createMethodQueueHandler:', () => {
    const createStubs = () => {
      const contextObj = { _testq: [] };
      const apiObj = {
        method1: td.function('method1'),
        method2: td.function('method2'),
      };
      return { contextObj, apiObj };
    };

    it('should create a new method queue within the given context', () => {
      const { contextObj, apiObj } = createStubs();

      delete contextObj._testq;
      methodQueue.createMethodQueueHandler(contextObj, '_testq', apiObj);

      assert.isTrue(typeof contextObj._testq !== 'undefined', 'method queue is defined');
      assert.isTrue(typeof contextObj._testq.push === 'function', 'push method exists');
    });

    it('should use an existing method queue within the given context', () => {
      const { contextObj, apiObj } = createStubs();

      methodQueue.createMethodQueueHandler(contextObj, '_testq', apiObj);

      assert.isTrue(typeof contextObj._testq !== 'undefined', 'method queue is defined');
      assert.isTrue(typeof contextObj._testq.push === 'function', 'push method exists');
    });

    it('should recognize and execute methods that have been added BEFORE initialization', () => {
      const { contextObj, apiObj } = createStubs();

      contextObj._testq.push(['method1', 123, 'foo']);
      contextObj._testq.push(['method2', { data: 'test' }]);
      methodQueue.createMethodQueueHandler(contextObj, '_testq', apiObj);

      td.verify(apiObj.method1(123, 'foo'));
      td.verify(apiObj.method2({ data: 'test' }));
    });

    it('should recognize and execute methods that have been added AFTER initialization', () => {
      const { contextObj, apiObj } = createStubs();
      methodQueue.createMethodQueueHandler(contextObj, '_testq', apiObj);
      contextObj._testq.push(['method1', 123, 'foo']);
      contextObj._testq.push(['method2', { data: 'test' }]);

      td.verify(apiObj.method1(123, 'foo'));
      td.verify(apiObj.method2({ data: 'test' }));
    });

    it('should throw an error on methods that are not available in API object', () => {
      const { contextObj, apiObj } = createStubs();

      assert.throws(
        () => {
          methodQueue.createMethodQueueHandler(contextObj, '_testq', apiObj);
          contextObj._testq.push(['kaboom', 'bazinga!']);
        },
        /method "kaboom" not found/gi,
        'should throw error on missing method'
      );
    });
  });
});
