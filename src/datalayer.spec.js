/* eslint-disable max-len, no-new */
// properly define implicit globals
const {
  describe,
  it,
  beforeEach,
  expect,
  jsdom,
} = global;

/**
 * Mock plugin to test plugin specific stuff (event retrieval,
 * config overrides, ...).
 */
class MockPlugin {
  constructor(datalayer, data, config) {
    this.config = config;
    this.events = {};
  }

  static getID() {
    return 'test/mockPlugin';
  }

  handleEvent(eventName, eventData) {
    this.events[eventName] = eventData;
  }
}

describe('datalayer', () => {
  let [module, datalayer, globalDataMock] = [];

  beforeEach(() => {
    // setup per-test fixtures
    globalDataMock = {
      site: { id: 'mysite' },
      page: { name: 'foo', type: 'bar' },
      user: {},
    };
    // import module
    return import('./datalayer').then((m) => {
      datalayer = m.default;
      module = m;
    });
  });

  it('should be an object', () => {
    expect(typeof datalayer === 'object').toBe(true);
  });

  describe('initialize', () => {
    it('should properly recognize invalid and/or missing data', () => {
      expect(() => datalayer.initialize({ data: { page: { } } }))
        .toThrow(/DALPageData is invalid or missing/gi);

      expect(() => datalayer.initialize({ data: { page: globalDataMock.page } }))
        .toThrow(/DALSiteData is invalid or missing/gi);

      // TODO: invalid site data
      expect(() => datalayer.initialize({ data: { page: globalDataMock.page, site: globalDataMock.site } }))
        .toThrow(/DALUserData is invalid or missing/gi);
    });

    it('should add single plugin when passing a function to the `plugins` option', () => {
      const d7r = new module.Datalayer();

      d7r.initialize({
        data: globalDataMock,
        plugins: [new MockPlugin()],
      });

      return d7r.whenReady().then(() => {
        expect(d7r.getPluginByID('test/mockPlugin')).toBeDefined();
      });
    });

    it('should add multiple plugins when passing an array to the `plugins` option', () => {
      const d7r = new module.Datalayer();

      d7r.initialize({
        data: globalDataMock,
        plugins: [new MockPlugin(), new MockPlugin()],
      });

      return d7r.whenReady().then(() => {
        expect(d7r.getPluginByID('test/mockPlugin')).toBeDefined();
      });
    });

    /*
    it('should create a method queue handler in window', () => {
      const d7r = new module.Datalayer();

      d7r.initialize({ data: globalDataMock });

      assert.isDefined(window._dtlrq);
    });
    */
  });

  describe('testMode', () => {
    describe('enable/disable', () => {
      it('should activate testmode if URL contains __dtlrtest__=1', () => {
        jsdom.reconfigure({ url: 'http://example.com?__dtlrtest__=1' });
        const d7r = new module.Datalayer();

        d7r.initialize({ data: globalDataMock });

        expect(d7r.inTestMode()).toBe(true);
      });

      it('should still BE in testmode, even after fake reload', () => {
        jsdom.reconfigure({ url: 'http://example.com?__dtlrtest__=1' });
        new module.Datalayer();

        jsdom.reconfigure({ url: 'http://example.com' });
        const dal2 = new module.Datalayer();
        dal2.initialize({ data: globalDataMock });

        expect(dal2.inTestMode()).toBe(true);
      });

      it('should disable testmode if URL contains __dtlrtest__=0', () => {
        jsdom.reconfigure({ url: 'http://example.com?__dtlrtest__=0' });
        const d7r = new module.Datalayer();

        d7r.initialize({ data: globalDataMock });

        expect(d7r.inTestMode()).toBe(false);
      });

      it('should still NOT BE in testmode, even after fake reload', () => {
        jsdom.reconfigure({ url: 'http://example.com?__dtlrtest__=0' });
        new module.Datalayer();

        jsdom.reconfigure({ url: 'http://example.com' });
        const dal2 = new module.Datalayer();
        dal2.initialize({ data: globalDataMock });

        expect(dal2.inTestMode()).toBe(false);
      });
    });

    // @FIXME: I _think_ this is a false positive
    it('should load a specified plugin, if testmode is active, the mode evaluates to "test" and the rule evaluates to "true"', () => {
      jsdom.reconfigure({ url: 'http://example.com?__dtlrtest__=1' });
      const d7r = new module.Datalayer();
      const myPlugin = new MockPlugin();

      d7r.initialize({
        data: globalDataMock,
        plugins: [myPlugin],
      });

      return d7r.whenReady().then(() => {
        expect(d7r.getPluginByID('test/mockPlugin')).toEqual(myPlugin);
      });
    });

    /*
    // @FIXME: doesn't work
    it('should NOT load a specified plugin, if testmode is inactive, the mode evaluates to "test" and the rule evaluates to "true"', (st) => {
      dom.reconfigure({ url: 'http://example.com?__dtlrtest__=0' });
      const d7r = new module.Datalayer();
      d7r.initialize({
        data: globalDataMock,
        plugins: [
          { type: MockPlugin, rule: () => true, test: true },
        ],
      });
      return d7r.whenReady().then(() => {
        assert.equal(d7r.getPluginByID('test/mockPlugin', null));
      });
    });
    */
  });

  describe('whenReady', () => {
    it('should resolve when called BEFORE initialize', () => {
      const d7r = new module.Datalayer();

      const promise = d7r.whenReady().then(() => expect(d7r.isReady()).toBe(true));
      d7r.initialize({ data: globalDataMock });

      return promise;
    });

    it('should resolve when called AFTER initialize', () => {
      const d7r = new module.Datalayer();

      d7r.initialize({ data: globalDataMock });

      return d7r.whenReady().then(() => expect(d7r.isReady()).toBe(true));
    });
  });

  describe('addPlugin', () => {
    it('should add a plugin using addPlugin', () => {
      const d7r = new module.Datalayer();
      d7r.initialize({ data: globalDataMock });

      d7r.addPlugin(new MockPlugin());

      return d7r.whenReady().then(() => {
        expect(d7r.getPluginByID('test/mockPlugin')).toBeDefined();
      });
    });
  });

  describe('broadcast', () => {
    it('should broadcast an event to all available and interested plugins', () => {
      const d7r = new module.Datalayer();
      const plugin1 = new MockPlugin();
      const plugin2 = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      d7r.initialize({ data: globalDataMock, plugins: [plugin1, plugin2] });

      return d7r.whenReady().then(() => {
        d7r.broadcast(expectedEvent.name, expectedEvent.data);
        expect(plugin1.events[expectedEvent.name]).toEqual(expectedEvent.data);
        expect(plugin2.events[expectedEvent.name]).toEqual(expectedEvent.data);
      });
    });

    it('should broadcast an event that was sent BEFORE calling initialize', () => {
      const d7r = new module.Datalayer();
      const plugin = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      d7r.broadcast(expectedEvent.name, expectedEvent.data);
      d7r.initialize({ data: globalDataMock, plugins: [plugin] });

      d7r.whenReady().then(() => {
        expect(plugin.events[expectedEvent.name]).toEqual(expectedEvent.data);
      });
    });

    it('should broadcast an event that was sent AFTER calling initialize but BEFORE being ready', () => {
      const d7r = new module.Datalayer();
      const plugin = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      d7r.initialize({ data: globalDataMock, plugins: [plugin] });
      d7r.broadcast(expectedEvent.name, expectedEvent.data);

      return d7r.whenReady().then(() => {
        expect(plugin.events[expectedEvent.name]).toEqual(expectedEvent.data);
      });
    });

    it('should NOT broadcast event to plugins that are not interested (shouldReceiveEvent() === false)', () => {
      const d7r = new module.Datalayer();
      const plugin = new MockPlugin();
      plugin.shouldReceiveEvent = () => false;
      const expectedEvent = { name: 'test' };

      d7r.initialize({ data: globalDataMock, plugins: [plugin] });
      d7r.broadcast(expectedEvent.name, expectedEvent.data);

      return d7r.whenReady().then(() => {
        expect(plugin.events[expectedEvent.name]).not.toBeDefined();
      });
    });
  });

  describe('extensions', () => {
    // dummy extension for testing
    let dummyExtensionInstance = null;
    const dummyExtension = config => class DummyExtension {
      constructor(dtlr) {
        this.datalayer = dtlr;
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
        const d7r = new module.Datalayer();

        d7r.use(dummyExtension({ test: '123' }));

        expect(d7r.extensions.length === 1).toBe(true);
      });

      it('should pass the configuration to the extension', () => {
        const d7r = new module.Datalayer();
        const cfg = { test: '123' };

        d7r.use(dummyExtension(cfg));

        expect(d7r.extensions[0].config === cfg).toBe(true);
      });

      it('should return the datalayer instance', () => {
        const d7r = new module.Datalayer();

        expect(d7r.use(dummyExtension())).toEqual(d7r);
      });
    });

    describe('triggerExtensionHook', () => {
      it('should trigger a given extension hook', () => {
        const d7r = new module.Datalayer();

        // create extension, then inject our spy, then trigger hooks
        d7r.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = jest.fn();
        d7r.triggerExtensionHook('myTestingHook');

        expect(dummyExtensionInstance.myTestingHook).toHaveBeenCalled();
      });

      it('should trigger a given extension hook with the provided arguments', () => {
        const d7r = new module.Datalayer();

        // create extension, then inject our spy, then trigger hooks
        d7r.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = jest.fn();
        d7r.triggerExtensionHook('myTestingHook', { bar: 'foo' });

        expect(dummyExtensionInstance.myTestingHook).toHaveBeenCalledWith({ bar: 'foo' });
      });

      it('should trigger a given extension hook and return the individual hook results inside an array', () => {
        const d7r = new module.Datalayer();

        // create extension, then trigger hooks and check returned value
        d7r.use(dummyExtension());
        const ret = d7r.triggerExtensionHook('myTestingHook', { bar: 'foo' });

        expect(ret).toEqual([{ bar: 'foo' }]);
      });

      it('should trigger an extension hook and pass the expected arguments to the hook function', () => {
        const d7r = new module.Datalayer();

        // create extension, then inject our spy, then trigger hooks
        d7r.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = jest.fn();
        d7r.triggerExtensionHook('myTestingHook', 'foo', 'bar', 123, { foo: 'bar' });

        expect(dummyExtensionInstance.myTestingHook).toHaveBeenCalledWith('foo', 'bar', 123, { foo: 'bar' });
      });
    });
  });
});
