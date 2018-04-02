/* eslint-disable max-len */
import { describe, it, beforeEach } from 'mocha';
import { assert } from 'chai';
import td from 'testdouble';
import { JSDOM } from 'jsdom';

// stub dependencies
const dom = new JSDOM('<!DOCTYPE html>');
td.replace('./lib/window', dom.window);

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
    assert.isTrue(typeof datalayer === 'object');
  });

  describe('initialize:', () => {
    it('should properly recognize invalid and/or missing data', () => {
      assert.throws(
        () => datalayer.initialize({ data: { page: { } } }),
        /DALPageData is invalid or missing/gi,
        'should complain about invalid page data',
      );

      assert.throws(
        () => datalayer.initialize({ data: { page: globalDataMock.page } }),
        /DALSiteData is invalid or missing/gi,
        'should complain about missing site data',
      );

      // TODO: invalid site data
      assert.throws(
        () => datalayer.initialize({ data: { page: globalDataMock.page, site: globalDataMock.site } }),
        /DALUserData is invalid or missing/gi,
        'should complain about missing user data',
      );
    });

    it('should add single plugin when passing a function to the `plugins` option', () => {
      const dal = new module.Datalayer();

      dal.initialize({
        data: globalDataMock,
        plugins: [new MockPlugin()],
      });

      return dal.whenReady().then(() => {
        assert.isDefined(dal.getPluginById('test/mockPlugin'), 'plugin should be returned');
      });
    });

    it('should add multiple plugins when passing an array to the `plugins` option', () => {
      const dal = new module.Datalayer();

      dal.initialize({
        data: globalDataMock,
        plugins: [new MockPlugin(), new MockPlugin()],
      });

      return dal.whenReady().then(() => {
        assert.isDefined(dal.getPluginById('test/mockPlugin'), 'plugin should be returned');
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

  describe('testMode:', () => {
    it('should enable/disable testMode via URL', () => {
      dom.reconfigure({ url: 'http://example.com?__dtlrtest__=1' });
      const dal = new module.Datalayer();
      // console.log(dal);
      // console.log('.innerHTML', dom.window.document.querySelector('body'));
      // console.log('.cookie', dom.window.document.cookie);
      dal.initialize({ data: globalDataMock });
      assert.isTrue(dal.inTestMode(), 'should activate testmode if URL contains __dtlrtest__=1');

      dom.reconfigure({ url: 'http://example.com' });
      const dal2 = new module.Datalayer();
      dal2.initialize({ data: globalDataMock });
      assert.isTrue(dal2.inTestMode(), 'should still BE in testmode, even after fake reload');

      dom.reconfigure({ url: 'http://example.com?__dtlrtest__=0' });
      const dal3 = new module.Datalayer();
      dal3.initialize({ data: globalDataMock });
      assert.isFalse(dal3.inTestMode(), 'should disable testmode if URL contains __dtlrtest__=0');

      dom.reconfigure({ url: 'http://example.com' });
      const dal4 = new module.Datalayer();
      dal4.initialize({ data: globalDataMock });
      assert.isFalse(dal4.inTestMode(), 'should still NOT BE in testmode, even after fake reload');
    });

    // @FIXME: I _think_ this is a false positive
    it('should load a specified plugin, if testmode is active, the mode evaluates to "test" and the rule evaluates to "true"', () => {
      dom.reconfigure({ url: 'http://example.com?__dtlrtest__=1' });
      const dal = new module.Datalayer();

      dal.initialize({
        data: globalDataMock,
        plugins: [new MockPlugin()],
      });

      return dal.whenReady().then(() => {
        assert.notEqual(
          dal.getPluginById('test/mockPlugin'),
          null,
          'plugin should be loaded',
        );
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

  describe('whenReady:', () => {
    it('should resolve when called BEFORE initialize', () => {
      const dal = new module.Datalayer();

      const promise = dal.whenReady().then(() => {
        assert.isTrue(dal.isReady(), 'datalayer should be ready');
      });
      dal.initialize({ data: globalDataMock });

      return promise;
    });

    it('should resolve when called AFTER initialize', () => {
      const dal = new module.Datalayer();

      dal.initialize({ data: globalDataMock });

      return dal.whenReady().then(() => {
        assert.isTrue(dal.isReady(), 'datalayer should be ready');
      });
    });
  });

  describe('addPlugin:', () => {
    it('should add a plugin using addPlugin', () => {
      const dal = new module.Datalayer();
      dal.initialize({ data: globalDataMock });

      dal.addPlugin(new MockPlugin());

      return dal.whenReady().then(() => {
        assert.isDefined(dal.getPluginById('test/mockPlugin'), 'plugin should be loaded');
      });
    });
  });

  describe('broadcast:', () => {
    it('should broadcast an event to all available plugins', () => {
      const dal = new module.Datalayer();
      const plugin1 = new MockPlugin();
      const plugin2 = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      dal.initialize({ data: globalDataMock, plugins: [plugin1, plugin2] });

      return dal.whenReady().then(() => {
        dal.broadcast(expectedEvent.name, expectedEvent.data);
        assert.deepEqual(
          plugin1.events[expectedEvent.name],
          expectedEvent.data,
          'plugin 1 should have caught the expected event and data',
        );
        assert.deepEqual(
          plugin2.events[expectedEvent.name],
          expectedEvent.data,
          'plugin 2 should have caught the expected event and data',
        );
      });
    });

    it('should broadcast an event that was sent BEFORE calling initialize', () => {
      const dal = new module.Datalayer();
      const plugin = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      dal.broadcast(expectedEvent.name, expectedEvent.data);
      dal.initialize({ data: globalDataMock, plugins: [plugin] });

      dal.whenReady().then(() => {
        assert.deepEqual(
          plugin.events[expectedEvent.name],
          expectedEvent.data,
          'plugin should have caught the expected event and data',
        );
      });
    });

    it('should broadcast an event that was sent AFTER calling initialize but BEFORE being ready', () => {
      const dal = new module.Datalayer();
      const plugin = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      dal.initialize({ data: globalDataMock, plugins: [plugin] });
      dal.broadcast(expectedEvent.name, expectedEvent.data);

      return dal.whenReady().then(() => {
        assert.deepEqual(
          plugin.events[expectedEvent.name],
          expectedEvent.data,
          'plugin should have caught the expected event and data',
        );
      });
    });
  });

  describe('extensions:', () => {
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

    describe('use:', () => {
      it('should load an extension when calling use', () => {
        const dal = new module.Datalayer();

        dal.use(dummyExtension({ test: '123' }));

        assert(dal.extensions.length === 1);
      });

      it('should pass the configuration to the extension', () => {
        const dal = new module.Datalayer();
        const cfg = { test: '123' };

        dal.use(dummyExtension(cfg));

        assert(dal.extensions[0].config === cfg);
      });

      it('should return the datalayer instance', () => {
        const dal = new module.Datalayer();

        assert.equal(dal.use(dummyExtension()), dal);
      });
    });

    describe('triggerExtensionHook:', () => {
      it('should trigger a given extension hook', () => {
        const dal = new module.Datalayer();

        // create extension, then inject our spy, then trigger hooks
        dal.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = td.function();
        dal.triggerExtensionHook('myTestingHook');

        td.verify(dummyExtensionInstance.myTestingHook());
      });

      it('should trigger a given extension hook with the provided arguments', () => {
        const dal = new module.Datalayer();

        // create extension, then inject our spy, then trigger hooks
        dal.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = td.function();
        dal.triggerExtensionHook('myTestingHook', { bar: 'foo' });

        td.verify(dummyExtensionInstance.myTestingHook({ bar: 'foo' }));
      });

      it('should trigger a given extension hook and return the individual hook results inside an array', () => {
        const dal = new module.Datalayer();

        // create extension, then trigger hooks and check returned value
        dal.use(dummyExtension());
        const ret = dal.triggerExtensionHook('myTestingHook', { bar: 'foo' });

        assert.deepEqual(ret, [{ bar: 'foo' }]);
      });

      it('should trigger an extension hook and pass the expected arguments to the hook function', () => {
        const dal = new module.Datalayer();

        // create extension, then inject our spy, then trigger hooks
        dal.use(dummyExtension());
        dummyExtensionInstance.myTestingHook = td.function();
        dal.triggerExtensionHook('myTestingHook', 'foo', 'bar', 123, { foo: 'bar' });

        td.verify(dummyExtensionInstance.myTestingHook('foo', 'bar', 123, { foo: 'bar' }));
      });
    });
  });
});
