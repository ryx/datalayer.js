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
      const dal = new module.Datalayer();

      dal.initialize({
        data: globalDataMock,
        plugins: [new MockPlugin()],
      });

      return dal.whenReady().then(() => {
        expect(dal.getPluginById('test/mockPlugin')).toBeDefined();
      });
    });

    it('should add multiple plugins when passing an array to the `plugins` option', () => {
      const dal = new module.Datalayer();

      dal.initialize({
        data: globalDataMock,
        plugins: [new MockPlugin(), new MockPlugin()],
      });

      return dal.whenReady().then(() => {
        expect(dal.getPluginById('test/mockPlugin')).toBeDefined();
      });
    });

    /*
    it('should create a method queue handler in window', () => {
      const dal = new module.Datalayer();

      dal.initialize({ data: globalDataMock });

      assert.isDefined(window._dtlrq);
    });
    */
  });

  describe('testMode', () => {
    describe('enable/disable', () => {
      it('should activate testmode if URL contains __dtlrtest__=1', () => {
        jsdom.reconfigure({ url: 'http://example.com?__dtlrtest__=1' });
        const dal = new module.Datalayer();

        dal.initialize({ data: globalDataMock });

        expect(dal.inTestMode()).toBe(true);
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
        const dal = new module.Datalayer();

        dal.initialize({ data: globalDataMock });

        expect(dal.inTestMode()).toBe(false);
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
      const dal = new module.Datalayer();
      const myPlugin = new MockPlugin();

      dal.initialize({
        data: globalDataMock,
        plugins: [myPlugin],
      });

      return dal.whenReady().then(() => {
        expect(dal.getPluginById('test/mockPlugin')).toEqual(myPlugin);
      });
    });

    /*
    // @FIXME: doesn't work
    it('should NOT load a specified plugin, if testmode is inactive, the mode evaluates to "test" and the rule evaluates to "true"', (st) => {
      dom.reconfigure({ url: 'http://example.com?__dtlrtest__=0' });
      const dal = new module.Datalayer();
      dal.initialize({
        data: globalDataMock,
        plugins: [
          { type: MockPlugin, rule: () => true, test: true },
        ],
      });
      return dal.whenReady().then(() => {
        assert.equal(dal.getPluginById('test/mockPlugin', null));
      });
    });
    */
  });

  describe('whenReady', () => {
    it('should resolve when called BEFORE initialize', () => {
      const dal = new module.Datalayer();

      const promise = dal.whenReady().then(() => expect(dal.isReady()).toBe(true));
      dal.initialize({ data: globalDataMock });

      return promise;
    });

    it('should resolve when called AFTER initialize', () => {
      const dal = new module.Datalayer();

      dal.initialize({ data: globalDataMock });

      return dal.whenReady().then(() => expect(dal.isReady()).toBe(true));
    });
  });

  describe('addPlugin', () => {
    it('should add a plugin using addPlugin', () => {
      const dal = new module.Datalayer();
      dal.initialize({ data: globalDataMock });

      dal.addPlugin(new MockPlugin());

      return dal.whenReady().then(() => {
        expect(dal.getPluginById('test/mockPlugin')).toBeDefined();
      });
    });
  });

  describe('broadcast', () => {
    it('should broadcast an event to all available plugins', () => {
      const dal = new module.Datalayer();
      const plugin1 = new MockPlugin();
      const plugin2 = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      dal.initialize({ data: globalDataMock, plugins: [plugin1, plugin2] });

      return dal.whenReady().then(() => {
        dal.broadcast(expectedEvent.name, expectedEvent.data);
        expect(plugin1.events[expectedEvent.name]).toEqual(expectedEvent.data);
        expect(plugin2.events[expectedEvent.name]).toEqual(expectedEvent.data);
      });
    });

    it('should broadcast an event that was sent BEFORE calling initialize', () => {
      const dal = new module.Datalayer();
      const plugin = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      dal.broadcast(expectedEvent.name, expectedEvent.data);
      dal.initialize({ data: globalDataMock, plugins: [plugin] });

      dal.whenReady().then(() => {
        expect(plugin.events[expectedEvent.name]).toEqual(expectedEvent.data);
      });
    });

    it('should broadcast an event that was sent AFTER calling initialize but BEFORE being ready', () => {
      const dal = new module.Datalayer();
      const plugin = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      dal.initialize({ data: globalDataMock, plugins: [plugin] });
      dal.broadcast(expectedEvent.name, expectedEvent.data);

      return dal.whenReady().then(() => {
        expect(plugin.events[expectedEvent.name]).toEqual(expectedEvent.data);
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
        const dal = new module.Datalayer();

        dal.use(dummyExtension({ test: '123' }));

        expect(dal.extensions.length === 1).toBe(true);
      });

      it('should pass the configuration to the extension', () => {
        const dal = new module.Datalayer();
        const cfg = { test: '123' };

        dal.use(dummyExtension(cfg));

        expect(dal.extensions[0].config === cfg).toBe(true);
      });

      it('should return the datalayer instance', () => {
        const dal = new module.Datalayer();

        expect(dal.use(dummyExtension())).toEqual(dal);
      });
    });

    describe('triggerExtensionHook', () => {
      it('should trigger a given extension hook', () => {
        const dal = new module.Datalayer();

        // create extension, then inject our spy, then trigger hooks
        dal.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = jest.fn();
        dal.triggerExtensionHook('myTestingHook');

        expect(dummyExtensionInstance.myTestingHook).toHaveBeenCalled();
      });

      it('should trigger a given extension hook with the provided arguments', () => {
        const dal = new module.Datalayer();

        // create extension, then inject our spy, then trigger hooks
        dal.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = jest.fn();
        dal.triggerExtensionHook('myTestingHook', { bar: 'foo' });

        expect(dummyExtensionInstance.myTestingHook).toHaveBeenCalledWith({ bar: 'foo' });
      });

      it('should trigger a given extension hook and return the individual hook results inside an array', () => {
        const dal = new module.Datalayer();

        // create extension, then trigger hooks and check returned value
        dal.use(dummyExtension());
        const ret = dal.triggerExtensionHook('myTestingHook', { bar: 'foo' });

        expect(ret).toEqual([{ bar: 'foo' }]);
      });

      it('should trigger an extension hook and pass the expected arguments to the hook function', () => {
        const dal = new module.Datalayer();

        // create extension, then inject our spy, then trigger hooks
        dal.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = jest.fn();
        dal.triggerExtensionHook('myTestingHook', 'foo', 'bar', 123, { foo: 'bar' });

        expect(dummyExtensionInstance.myTestingHook).toHaveBeenCalledWith('foo', 'bar', 123, { foo: 'bar' });
      });
    });
  });
});
