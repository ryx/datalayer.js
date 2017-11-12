import { test, skip } from 'tap';
import td from 'testdouble';
import { JSDOM } from 'jsdom';

// stub dependencies
const dom = new JSDOM('<!DOCTYPE html>');
const window = td.replace('./lib/window', dom.window);

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

// load library to be tested (XXX: enable debugging flag?)
import('./datalayer').then((module) => {
  const datalayer = module.default;
  const globalDataMock = {
    site: { id: 'mysite' },
    page: { name: 'foo', type: 'bar' },
    user: {},
  };

  test('datalayer:', (t) => {
    t.ok(typeof datalayer === 'object', 'should be an object');
    t.end();
  });

  test('datalayer.initialize:', (t) => {
    t.test('should properly recognize invalid and/or missing data', (st) => {
      st.throws(
        () => datalayer.initialize({ data: { page: { } } }),
        /DALPageData is invalid or missing/gi,
        'should complain about invalid page data',
      );

      st.throws(
        () => datalayer.initialize({ data: { page: globalDataMock.page } }),
        /DALSiteData is invalid or missing/gi,
        'should complain about missing site data',
      );

      // TODO: invalid site data
      st.throws(
        () => datalayer.initialize({ data: { page: globalDataMock.page, site: globalDataMock.site } }),
        /DALUserData is invalid or missing/gi,
        'should complain about missing user data',
      );

      st.end();
    });

    t.test('should add a plugin using the `plugins` option', (st) => {
      const dal = new module.Datalayer();

      dal.initialize({
        data: globalDataMock,
        plugins: [{ type: MockPlugin, rule: true }],
      });

      dal.whenReady().then(() => {
        st.ok(dal.getPluginById('test/mockPlugin'), 'plugin should be returned');
        st.end();
      });
    });

    t.test('should create a method queue handler in window', (st) => {
      const dal = new module.Datalayer();

      dal.initialize({ data: globalDataMock });

      st.ok(typeof window._dtlrq !== 'undefined', 'should install the _dtlrq method queue in window');
      st.end();
    });

    t.end();
  });

  test('datalayer.testMode:', (t) => {
    t.test('enable / disable via URL', (st) => {
      dom.reconfigure({ url: 'http://example.com?__odltest__=1' });
      const dal = new module.Datalayer();
      // console.log(dal);
      // console.log('.innerHTML', dom.window.document.querySelector('body'));
      // console.log('.cookie', dom.window.document.cookie);
      dal.initialize({ data: globalDataMock });
      st.ok(dal.inTestMode(), 'should activate testmode if URL contains __odltest__=1');

      dom.reconfigure({ url: 'http://example.com' });
      const dal2 = new module.Datalayer();
      dal2.initialize({ data: globalDataMock });
      st.ok(dal2.inTestMode(), 'should still BE in testmode, even after fake reload');

      dom.reconfigure({ url: 'http://example.com?__odltest__=0' });
      const dal3 = new module.Datalayer();
      dal3.initialize({ data: globalDataMock });
      st.notOk(dal3.inTestMode(), 'should disable testmode if URL contains __odltest__=0');

      dom.reconfigure({ url: 'http://example.com' });
      const dal4 = new module.Datalayer();
      dal4.initialize({ data: globalDataMock });
      st.notOk(dal4.inTestMode(), 'should still NOT BE in testmode, even after fake reload');

      st.end();
    });

    t.test('should load a specified plugin, if testmode is active, the mode evaluates to "test" and the rule evaluates to "true"', (st) => {
      dom.reconfigure({ url: 'http://example.com?__odltest__=1' });
      const dal = new module.Datalayer();
      dal.initialize({
        data: globalDataMock,
        plugins: [
          { type: MockPlugin, rule: () => true, test: true },
        ],
      });
      dal.whenReady().then(() => {
        st.isNot(
          dal.getPluginById('test/mockPlugin'),
          null,
          'plugin should be loaded',
        );
        st.end();
      });
    });

    /*
    // @FIXME: doesn't work
    test('should NOT load a specified plugin, if testmode is inactive, the mode evaluates to "test" and the rule evaluates to "true"', (st) => {
      dom.reconfigure({ url: 'http://example.com?__odltest__=0' });
      const dal = new module.Datalayer();
      dal.initialize({
        data: globalDataMock,
        plugins: [
          { type: MockPlugin, rule: () => true, test: true },
        ],
      });
      dal.whenReady().then(() => {
        st.is(dal.getPluginById('test/mockPlugin', null));
        st.end();
      });
    });
    */

    t.end();
  });

  test('datalayer.whenReady:', (t) => {
    t.test('should resolve when called BEFORE initialize', (st) => {
      const dal = new module.Datalayer();
      dal.whenReady().then(() => {
        st.ok(dal.isReady(), 'datalayer should be ready');
        st.end();
      });
      dal.initialize({ data: globalDataMock });
    });

    t.test('should resolve when called AFTER initialize', (st) => {
      const dal = new module.Datalayer();
      dal.initialize({ data: globalDataMock });
      dal.whenReady().then(() => {
        st.ok(dal.isReady(), 'datalayer should be ready');
        st.end();
      });
    });

    t.end();
  });

  test('datalayer.addPlugin:', (t) => {
    t.test('should add a plugin using addPlugin', (st) => {
      const dal = new module.Datalayer();
      dal.initialize({ data: globalDataMock });

      dal.addPlugin(MockPlugin, '');

      dal.whenReady().then(() => {
        st.ok(dal.getPluginById('test/mockPlugin'), 'plugin should be loaded');
        st.end();
      });
    });

    t.end();
  });

  test('datalayer.broadcast:', (t) => {
    // helper to broadcast an event to the given plugin and verify that it was caught
    const broadcastAndVerifyEvent = (_t, dal, plugin) => {
      const eventData = { foo: 'bar' };

      dal.broadcast('my-test-event', eventData);

      _t.ok(
        typeof plugin.events['my-test-event'] !== 'undefined',
        'plugin should have received the expected event',
      );
      _t.deepEqual(
        plugin.events['my-test-event'],
        eventData,
        'event should contain the expected data',
      );
    };

    // helper to create/initialize datalayer.js and pass the given plugins (and optional data)
    const setupDatalayerWithPlugins = (plugins, data) => {
      const dal = new module.Datalayer();
      dal.initialize({ data: data || globalDataMock, plugins });

      return dal;
    };

    t.test('should broadcast an event to plugins whose rule is undefined', (st) => {
      const dal = setupDatalayerWithPlugins([{ type: MockPlugin }]);

      dal.whenReady().then(() => {
        broadcastAndVerifyEvent(st, dal, dal.getPluginById('test/mockPlugin'));
        st.end();
      });
    });

    t.test('should broadcast an event to plugins whose rule equals "true" (boolean)', (st) => {
      const dal = setupDatalayerWithPlugins([{ type: MockPlugin, rule: true }]);

      dal.whenReady().then(() => {
        broadcastAndVerifyEvent(st, dal, dal.getPluginById('test/mockPlugin'));
        st.end();
      });
    });

    t.test('should broadcast an event to plugins whose rule resolves to "true" (function)', (st) => {
      const dal = setupDatalayerWithPlugins([
        { type: MockPlugin, rule: true }, // this one should receive all events
      ]);

      dal.whenReady().then(() => {
        broadcastAndVerifyEvent(st, dal, dal.getPluginById('test/mockPlugin'));
        st.end();
      });
    });

    /* @XXX: stupid test: plugin not loaded anyway, test in rules test instead!!
    t.test('should NOT broadcast an event to plugins whose rule resolves to "false" (function)', (st) => {
      const dal = setupDatalayerWithPlugins([
        { type: MockPlugin, rule: () => false }, // this one should receive no events
      ]);

      dal.whenReady().then(() => {
        dal.broadcast('my-test-event', { foo: 'bar' });

        st.ok(
          typeof dal.getPluginById('test/mockPlugin') === 'undefined',
          'plugin should NOT be loaded',
        );
        st.end();
      });
    });
    */

    t.test('should broadcast an event that was sent BEFORE calling initialize', (st) => {
      st.end();
    });

    t.test('should broadcast an event that was sent AFTER calling initialize', (st) => {
      st.end();
    });

    t.end();
  });

  td.reset();
});
