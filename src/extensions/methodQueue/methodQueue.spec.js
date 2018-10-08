/* eslint-disable max-len, no-new */
import methodQueue, { createMethodQueueHandler } from './methodQueue';

describe('methodQueue', () => {
  let datalayerMock = null;

  beforeEach(() => {
    datalayerMock = {
      broadcast: jest.fn(),
    };
  });

  describe('module:', () => {
    it('should export a factory which returns the extension class', () => {
      expect(typeof methodQueue()).toBe('function');
    });
  });

  describe('extension factory:', () => {
    it('should install a global method queue with the default name', () => {
      const ExtensionClass = methodQueue();

      new ExtensionClass(datalayerMock);

      expect(window._d7rq).toBeInstanceOf(Array);
    });

    it('should install a global method queue with a custom name if provided in config', () => {
      const ExtensionClass = methodQueue({ queueName: '_myqueue' });

      new ExtensionClass(datalayerMock);

      expect(window._myqueue).toBeInstanceOf(Array);
    });

    it.skip('should execute the associated API method when adding a method to the queue BEFORE init', () => {
      // ...
    });

    it.skip('should execute the associated API method when adding a method to the queue AFTER init', () => {
      // ...
    });
  });

  describe('createMethodQueueHandler:', () => {
    const createStubs = () => {
      const contextObj = { _testq: [] };
      const apiObj = {
        method1: jest.fn(),
        method2: jest.fn(),
      };
      return { contextObj, apiObj };
    };

    it('should create a new method queue within the given context', () => {
      const { contextObj, apiObj } = createStubs();

      delete contextObj._testq;
      createMethodQueueHandler(contextObj, '_testq', apiObj);

      expect(typeof contextObj._testq).toBeDefined();
      expect(typeof contextObj._testq.push).toBe('function');
    });

    it('should use an existing method queue within the given context', () => {
      const { contextObj, apiObj } = createStubs();

      createMethodQueueHandler(contextObj, '_testq', apiObj);

      expect(typeof contextObj._testq).toBeDefined();
      expect(typeof contextObj._testq.push).toBe('function');
    });

    it('should recognize and execute methods that have been added BEFORE initialization', () => {
      const { contextObj, apiObj } = createStubs();

      contextObj._testq.push(['method1', 123, 'foo']);
      contextObj._testq.push(['method2', { data: 'test' }]);
      createMethodQueueHandler(contextObj, '_testq', apiObj);

      expect(apiObj.method1).toHaveBeenCalledWith(123, 'foo');
      expect(apiObj.method2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should recognize and execute methods that have been added AFTER initialization', () => {
      const { contextObj, apiObj } = createStubs();
      createMethodQueueHandler(contextObj, '_testq', apiObj);
      contextObj._testq.push(['method1', 123, 'foo']);
      contextObj._testq.push(['method2', { data: 'test' }]);

      expect(apiObj.method1).toHaveBeenCalledWith(123, 'foo');
      expect(apiObj.method2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should throw an error on methods that are not available in API object', () => {
      const { contextObj, apiObj } = createStubs();

      expect(() => {
        createMethodQueueHandler(contextObj, '_testq', apiObj);
        contextObj._testq.push(['kaboom', 'bazinga!']);
      }).toThrow(/method "kaboom" not found/gi);
    });
  });
});
