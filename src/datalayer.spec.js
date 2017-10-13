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
    t.plan(4);

    t.test('should activate if URL contains __odltest__=1', (st) => {
      dom.reconfigure({ url: 'http://example.com?__odltest__=1' });
      const dal = new module.Datalayer();
      console.log(dal);
      console.log('.innerHTML', dom.window.document.querySelector('body'));
      console.log('.cookie', dom.window.document.cookie);
      dal.initialize({ data: globalDataMock });
      st.ok(dal.inTestMode(), 'inTestMode() should return true');
      st.end();
    });

    /* t.test('should set cookie if URL contains __odltest__=1', (st) => {
      dom.reconfigure({ url: 'http://example.com?__odltest__=1' });
      const dal = new module.Datalayer();
      dal.initialize({ data: globalDataMock });
      // td.verify(cookie.set('__odltest__'), { ignoreExtraArgs: true });
      st.ok(dal.inTestMode(), 'inTestMode() should return true');
      st.end();
    }); */

    t.test('should disable testmode if URL contains __odltest__=0', (st) => {
      dom.reconfigure({ url: 'http://example.com?__odltest__=0' });
      // td.when(cookie.get('__odltest__')).thenReturn('1');
      const dal = new module.Datalayer();
      dal.initialize({ data: globalDataMock });
      // td.verify(cookie.remove('__odltest__', td.matchers.anything()));
      st.notOk(dal.inTestMode(), 'inTestMode() should return false');
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
