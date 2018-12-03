/* eslint-disable max-len, no-new */
import { Datalayer } from '../../datalayer';
import methodQueue, { createMethodQueueHandler } from './methodQueue';

describe('methodQueue', () => {
  let datalayer = null;

  beforeEach(() => {
    datalayer = new Datalayer();
  });

  describe('module:', () => {
    it('should export a factory which returns the extension class', () => {
      expect(typeof methodQueue()).toBe('function');
    });
  });

  describe('extension factory:', () => {
    it('should install a global method queue with the default name, when used', () => {
      datalayer
        .use(methodQueue())
        .initialize()
        .then(() => {
          expect(window._d7rq).toBeInstanceOf(Array);
        });
    });

    it('should install a global method queue with a custom name if provided in config, when used', () => {
      datalayer
        .use(methodQueue({ queueName: '_myqueue' }))
        .initialize()
        .then(() => {
          expect(window._myqueue).toBeInstanceOf(Array);
        });
    });
  });

  describe('runtime:', () => {
    it('should execute the associated API method after datalayer is ready, when adding a method to the queue BEFORE init', () => {
      window._d7rq = [];
      window._d7rq.push(['broadcast', 'test-event', { foo: 'bar' }]);
      const broadcastSpy = jest.spyOn(datalayer, 'broadcast');

      datalayer
        .use(methodQueue())
        .initialize()
        .then(() => {
          expect(broadcastSpy).toHaveBeenCalledWith('test-event', { foo: 'bar' });
        });
    });

    it('should NOT execute the associated API method BEFORE datalayer has initialized, when adding a method to the queue BEFORE init', () => {
      const broadcastSpy = jest.spyOn(datalayer, 'broadcast');
      datalayer
        .use(methodQueue());

      window._d7rq = [];
      window._d7rq.push(['broadcast', 'test-event', { foo: 'bar' }]);

      expect(broadcastSpy).not.toHaveBeenCalledWith('test-event', { foo: 'bar' });
    });

    it('should execute the associated API method when adding a method to the queue AFTER init and AFTER the datalayer is ready ', (done) => {
      const broadcastSpy = jest.spyOn(datalayer, 'broadcast');
      datalayer
        .use(methodQueue())
        .initialize();

      window._d7rq = [];
      window._d7rq.push(['broadcast', 'test-event', { foo: 'bar' }]);

      datalayer
        .whenReady()
        .then(() => {
          expect(broadcastSpy).toHaveBeenCalledWith('test-event', { foo: 'bar' });
          done();
        });
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
