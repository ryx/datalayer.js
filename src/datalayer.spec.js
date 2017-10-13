import test from 'tape';
import td from 'testdouble';
import { JSDOM } from 'jsdom';

// stub dependencies
const dom = new JSDOM('<!DOCTYPE html>');
td.replace('./lib/window', dom.window);

// mock plugin to test various plugin-related things
class MockPlugin {
  constructor(datalayer, data, config) {
    this.__type__ = 'Mock';
    this.datalayer = datalayer;
    this.data = data;
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
    t.plan(3);

    t.throws(
      () => datalayer.initialize({ data: { page: { } } }),
      /DALPageData is invalid or missing/gi,
      'should complain about invalid page data',
    );

    t.throws(
      () => datalayer.initialize({ data: { page: globalDataMock.page } }),
      /DALSiteData is invalid or missing/gi,
      'should complain about missing site data',
    );

    // TODO: invalid site data
    t.throws(
      () => datalayer.initialize({ data: { page: globalDataMock.page, site: globalDataMock.site } }),
      /DALUserData is invalid or missing/gi,
      'should complain about missing user data',
    );
  });

  test('datalayer.testMode:', (t) => {
    t.plan(3);

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
        st.isNot(dal.getPluginById('test/mockPlugin', null));
        st.end();
      });
    });

    // @FIXME: doesn't work
    t.skip('should NOT load a specified plugin, if testmode is inactive, the mode evaluates to "test" and the rule evaluates to "true"', (st) => {
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

    t.end();
  });

  test('datalayer.whenReady:', (t) => {
    t.test('should resolve when called BEFORE initialize', (st) => {
      const dal = new module.Datalayer();
      dal.whenReady().then(() => {
        st.ok(dal.isReady(), '[datalayer.isReady()] should be true');
        st.end();
      });
      dal.initialize({ data: globalDataMock });
    });

    t.test('should resolve when called AFTER initialize', (st) => {
      const dal = new module.Datalayer();
      dal.initialize({ data: globalDataMock });
      dal.whenReady().then(() => {
        st.ok(dal.isReady(), '[datalayer.isReady()] should be true');
        st.end();
      });
    });

    t.end();
  });

  td.reset();
});
