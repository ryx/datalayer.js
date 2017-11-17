/* eslint-disable max-len */
import { test } from 'tap';
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

    t.test('should add single plugin when passing a function to the `plugins` option', (st) => {
      const dal = new module.Datalayer();

      dal.initialize({
        data: globalDataMock,
        plugins: () => [new MockPlugin()],
      });

      dal.whenReady().then(() => {
        st.ok(dal.getPluginById('test/mockPlugin'), 'plugin should be returned');
        st.end();
      });
    });

    t.test('should add multiple plugins when passing an array to the `plugins` option', (st) => {
      const dal = new module.Datalayer();

      dal.initialize({
        data: globalDataMock,
        plugins: [
          () => [new MockPlugin(), new MockPlugin()],
        ],
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
          () => (dal.isTestModeActive() ? [new MockPlugin()] : null),
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

      dal.addPlugin(new MockPlugin());

      dal.whenReady().then(() => {
        st.ok(dal.getPluginById('test/mockPlugin'), 'plugin should be loaded');
        st.end();
      });
    });

    t.end();
  });

  test('datalayer.broadcast:', (t) => {
    t.test('should broadcast an event to all available plugins', (st) => {
      const dal = new module.Datalayer();
      const plugin1 = new MockPlugin();
      const plugin2 = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      dal.initialize({ data: globalDataMock, plugins: () => [plugin1, plugin2] });

      dal.whenReady().then(() => {
        dal.broadcast(expectedEvent.name, expectedEvent.data);
        st.deepEqual(
          plugin1.events[expectedEvent.name],
          expectedEvent.data,
          'plugin 1 should have caught the expected event and data',
        );
        st.deepEqual(
          plugin2.events[expectedEvent.name],
          expectedEvent.data,
          'plugin 2 should have caught the expected event and data',
        );
        st.end();
      });
    });

    t.test('should broadcast an event that was sent BEFORE calling initialize', (st) => {
      const dal = new module.Datalayer();
      const plugin = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      dal.broadcast(expectedEvent.name, expectedEvent.data);
      dal.initialize({ data: globalDataMock, plugins: () => [plugin] });

      dal.whenReady().then(() => {
        st.deepEqual(
          plugin.events[expectedEvent.name],
          expectedEvent.data,
          'plugin should have caught the expected event and data',
        );
        st.end();
      });
    });

    t.test('should broadcast an event that was sent AFTER calling initialize but before being ready', (st) => {
      const dal = new module.Datalayer();
      const plugin = new MockPlugin();
      const expectedEvent = { name: 'my-test-event', data: { foo: 123 } };

      dal.initialize({ data: globalDataMock, plugins: () => [plugin] });
      dal.broadcast(expectedEvent.name, expectedEvent.data);

      dal.whenReady().then(() => {
        st.deepEqual(
          plugin.events[expectedEvent.name],
          expectedEvent.data,
          'plugin should have caught the expected event and data',
        );
        st.end();
      });
    });

    t.end();
  });

  // @TODO: scanElementForDataMarkup, scanElementForEventsMarkup

  td.reset();
});
