/* eslint-disable max-len, no-new */
import Plugin from './Plugin';
import datalayer, { Datalayer } from './datalayer';
import Extension from './Extension';

/**
 * Mock plugin to test plugin specific stuff (event retrieval,
 * config overrides, ...).
 */
class MockPlugin extends Plugin {
  constructor(config, rules) {
    super('mockPlugin', config, rules);
    this.config = config;
    this.events = {};
    this.handleEvent = jest.fn();
  }
}

describe('datalayer', () => {
  let [globalDataMock] = [];

  beforeEach(() => {
    // setup per-test fixtures
    globalDataMock = {
      site: { id: 'mysite' },
      page: { name: 'foo', type: 'bar' },
      user: {},
    };
  });

  it('should be an object', () => {
    expect(typeof datalayer === 'object').toBe(true);
  });

  describe('initialize', () => {
    it('should trigger the beforeInitialize extension hook', () => {
      const d7r = new Datalayer();
      const triggerExtensionHookSpy = jest.spyOn(d7r, 'triggerExtensionHook');

      d7r.initialize({ data: globalDataMock });

      expect(triggerExtensionHookSpy).toHaveBeenCalledWith('beforeInitialize');
    });

    it('should execute a user-provided validation callback and pass the global data', () => {
      const d7r = new Datalayer();
      const expectedData = { foo: 'bar' };
      const validationCallback = jest.fn();

      d7r.initialize({
        data: expectedData,
        validateData: validationCallback,
      });

      expect(validationCallback).toHaveBeenCalledWith(expectedData);
    });

    it('should resolve and return the readyPromise when validation callback NOT exists', () => {
      const d7r = new Datalayer();
      const expectedData = { foo: 'bar' };
      const config = { data: expectedData };

      return expect(d7r.initialize(config)).resolves.toEqual(expectedData);
    });

    it('should resolve and return the readyPromise when validation callback exists and does NOT throw', () => {
      const d7r = new Datalayer();
      const expectedData = { foo: 'bar' };
      const config = {
        data: expectedData,
        validateData: () => {},
      };

      return expect(d7r.initialize(config)).resolves.toEqual(expectedData);
    });

    it('should reject and return the readyPromise when validation callback exists and throws an Error', () => {
      const d7r = new Datalayer();
      const expectedError = new Error('ouch');
      const config = { validateData: () => { throw expectedError; } };

      return expect(d7r.initialize(config)).rejects.toEqual(expectedError);
    });

    it('should add a single plugin to the `plugins` option', () => {
      const d7r = new Datalayer();

      d7r.initialize({
        data: globalDataMock,
        plugins: [new MockPlugin()],
      });

      return d7r.whenReady().then(() => {
        expect(d7r.getPluginByID('mockPlugin')).toBeInstanceOf(MockPlugin);
      });
    });

    it('should add multiple plugins to the `plugins` option', () => {
      const d7r = new Datalayer();

      d7r.initialize({
        data: globalDataMock,
        plugins: [new MockPlugin(), new MockPlugin()],
      });

      return d7r.whenReady().then(() => {
        expect(d7r.plugins.length).toEqual(2);
      });
    });

    it('should send an "initialized" event and pass the global data after plugins are loaded', () => {
      const d7r = new Datalayer();
      const myMockPlugin = new MockPlugin();

      d7r.initialize({
        data: globalDataMock,
        plugins: [myMockPlugin],
      });

      return d7r.whenReady().then(() => {
        expect(myMockPlugin.handleEvent).toHaveBeenCalledWith('initialized', globalDataMock);
      });
    });

    it('should send an "initialize-failed" event when validation calllback throws an error', () => {
      const d7r = new Datalayer();
      const myMockPlugin = new MockPlugin();
      const expectedError = new Error('ouch');
      const validationCallback = () => { throw expectedError; };

      d7r.initialize({
        data: globalDataMock,
        plugins: [myMockPlugin],
        validateData: validationCallback,
      });

      return d7r.whenReady().catch(() => {
        expect(myMockPlugin.handleEvent).toHaveBeenCalledWith('initialize-failed', expectedError);
      });
    });
  });

  describe('whenReady', () => {
    it('should resolve when called BEFORE initialize', () => {
      const d7r = new Datalayer();

      const promise = d7r.whenReady().then(() => expect(d7r.isReady()).toBe(true));
      d7r.initialize({ data: globalDataMock });

      return promise;
    });

    it('should resolve when called AFTER initialize', () => {
      const d7r = new Datalayer();

      d7r.initialize({ data: globalDataMock });

      return d7r.whenReady().then(() => expect(d7r.isReady()).toBe(true));
    });
  });

  describe('addPlugin', () => {
    it('should add a plugin using addPlugin', () => {
      const d7r = new Datalayer();
      d7r.initialize({ data: globalDataMock });

      d7r.addPlugin(new MockPlugin());

      return d7r.whenReady().then(() => {
        expect(d7r.getPluginByID('mockPlugin')).toBeInstanceOf(MockPlugin);
      });
    });

    it('should trigger the appropriate extension hook and pass the expected plugin', () => {
      const d7r = new Datalayer();
      const plugin = new MockPlugin();
      const triggerExtensionHookSpy = jest.spyOn(d7r, 'triggerExtensionHook');
      d7r.initialize({ data: globalDataMock });

      d7r.addPlugin(plugin);

      expect(triggerExtensionHookSpy).toHaveBeenCalledWith('beforeAddPlugin', plugin);
    });

    it('should abort plugin execution if an extension\'s `beforeAddPlugin` hook returns `false`', () => {
      const d7r = new Datalayer();
      const plugin = new MockPlugin();
      const extensionStub1 = { beforeAddPlugin: jest.fn() };
      const extensionStub2 = { beforeAddPlugin: jest.fn() };
      extensionStub1.beforeAddPlugin.mockReturnValue(true);
      extensionStub2.beforeAddPlugin.mockReturnValue(false);
      d7r.use(() => extensionStub1);
      d7r.use(() => extensionStub2);
      d7r.initialize({ data: globalDataMock });

      d7r.addPlugin(plugin);

      expect(extensionStub1.beforeAddPlugin).toHaveBeenCalledWith(plugin);
      expect(extensionStub2.beforeAddPlugin).toHaveBeenCalledWith(plugin);
      expect(d7r.plugins).not.toContain(plugin);
    });

    it('should register datalayer to the individual plugin', () => {
      const d7r = new Datalayer();
      const plugin = new MockPlugin();
      d7r.addPlugin(plugin);
      expect(plugin.datalayer).toBe(d7r);
    });
  });

  describe('broadcast', () => {
    it('should broadcast an event to all available and interested plugins', () => {
      const d7r = new Datalayer();
      const plugin1 = new MockPlugin();
      const plugin2 = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      d7r.initialize({ data: globalDataMock, plugins: [plugin1, plugin2] });

      return d7r.whenReady().then(() => {
        d7r.broadcast(expectedEvent.name, expectedEvent.data);
        expect(plugin1.handleEvent).toHaveBeenCalledWith(expectedEvent.name, expectedEvent.data);
        expect(plugin2.handleEvent).toHaveBeenCalledWith(expectedEvent.name, expectedEvent.data);
      });
    });

    it('should broadcast an event that was sent BEFORE calling initialize', () => {
      const d7r = new Datalayer();
      const plugin = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      d7r.broadcast(expectedEvent.name, expectedEvent.data);
      d7r.initialize({ data: globalDataMock, plugins: [plugin] });

      d7r.whenReady().then(() => {
        expect(plugin.handleEvent).toHaveBeenCalledWith(expectedEvent.name, expectedEvent.data);
      });
    });

    it('should broadcast an event that was sent AFTER calling initialize but BEFORE being ready', () => {
      const d7r = new Datalayer();
      const plugin = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      d7r.initialize({ data: globalDataMock, plugins: [plugin] });
      d7r.broadcast(expectedEvent.name, expectedEvent.data);

      return d7r.whenReady().then(() => {
        expect(plugin.handleEvent).toHaveBeenCalledWith(expectedEvent.name, expectedEvent.data);
      });
    });

    it('should pass event name and data to plugin.sshouldReceiveEvent', () => {
      const d7r = new Datalayer();
      const plugin = new MockPlugin();
      plugin.shouldReceiveEvent = jest.fn();
      const expectedEvent = { name: 'test' };

      d7r.initialize({ data: globalDataMock, plugins: [plugin] });
      d7r.broadcast(expectedEvent.name, expectedEvent.data);

      return d7r.whenReady().then(() => {
        expect(plugin.shouldReceiveEvent).toHaveBeenCalledWith(expectedEvent.name, expectedEvent.data);
      });
    });

    it('should NOT broadcast event to plugins that are not interested (shouldReceiveEvent() === false)', () => {
      const d7r = new Datalayer();
      const plugin = new MockPlugin();
      plugin.shouldReceiveEvent = () => false;
      const expectedEvent = { name: 'test' };

      d7r.initialize({ data: globalDataMock, plugins: [plugin] });
      d7r.broadcast(expectedEvent.name, expectedEvent.data);

      return d7r.whenReady().then(() => {
        expect(plugin.handleEvent).not.toHaveBeenCalledWith(expectedEvent.name, expectedEvent.data);
      });
    });
  });

  describe('parseDOMNode', () => {
    it('should trigger the appropriate extension hook and pass the expected node', () => {
      const d7r = new Datalayer();
      const triggerExtensionHookSpy = jest.spyOn(d7r, 'triggerExtensionHook');

      d7r.parseDOMNode(window.document.body);

      expect(triggerExtensionHookSpy).toHaveBeenCalledWith('beforeParseDOMNode', window.document.body);
    });

    it('should receive the window as default node', () => {
      const d7r = new Datalayer();
      const triggerExtensionHookSpy = jest.spyOn(d7r, 'triggerExtensionHook');

      d7r.parseDOMNode();

      expect(triggerExtensionHookSpy).toHaveBeenCalledWith('beforeParseDOMNode', window.document);
    });
  });

  describe('extensions', () => {
    // dummy extension for testing
    let dummyExtensionInstance = null;
    const dummyExtension = config => class DummyExtension extends Extension {
      constructor(d7r) {
        super('DummyExtension', d7r);
        this.config = config;
        dummyExtensionInstance = this;
      }

      /* eslint-disable class-methods-use-this */
      myTestingHook(data) {
        return data;
      }
      /* eslint-enable */
    };

    describe('use', () => {
      it('should load an extension when calling use', () => {
        const d7r = new Datalayer();

        d7r.use(dummyExtension({ test: '123' }));

        d7r.initialize();

        expect(d7r.extensions.length === 1).toBe(true);
        expect(d7r.getExtensionByID('DummyExtension')).toBeInstanceOf(Extension);
      });

      it('should pass the configuration to the extension', () => {
        const d7r = new Datalayer();
        const cfg = { test: '123' };

        d7r.use(dummyExtension(cfg));

        expect(d7r.extensions[0].config === cfg).toBe(true);
      });

      it('should return the datalayer instance', () => {
        const d7r = new Datalayer();

        expect(d7r.use(dummyExtension())).toEqual(d7r);
      });
    });

    describe('triggerExtensionHook', () => {
      it('should trigger a given extension hook', () => {
        const d7r = new Datalayer();

        // create extension, then inject our spy, then trigger hooks
        d7r.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = jest.fn();
        d7r.triggerExtensionHook('myTestingHook');

        expect(dummyExtensionInstance.myTestingHook).toHaveBeenCalled();
      });

      it('should trigger a given extension hook with the provided arguments', () => {
        const d7r = new Datalayer();

        // create extension, then inject our spy, then trigger hooks
        d7r.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = jest.fn();
        d7r.triggerExtensionHook('myTestingHook', { bar: 'foo' });

        expect(dummyExtensionInstance.myTestingHook).toHaveBeenCalledWith({ bar: 'foo' });
      });

      it('should trigger a given extension hook and return the individual hook results inside an array', () => {
        const d7r = new Datalayer();

        // create extension, then trigger hooks and check returned value
        d7r.use(dummyExtension());
        const ret = d7r.triggerExtensionHook('myTestingHook', { bar: 'foo' });

        expect(ret).toEqual([{ bar: 'foo' }]);
      });

      it('should trigger an extension hook and pass the expected arguments to the hook function', () => {
        const d7r = new Datalayer();

        // create extension, then inject our spy, then trigger hooks
        d7r.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = jest.fn();
        d7r.triggerExtensionHook('myTestingHook', 'foo', 'bar', 123, { foo: 'bar' });

        expect(dummyExtensionInstance.myTestingHook).toHaveBeenCalledWith('foo', 'bar', 123, { foo: 'bar' });
      });
    });
  });
});
