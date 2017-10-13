import test from 'tape';
import td from 'testdouble';
import { JSDOM } from 'jsdom';

// stub dependencies
const dom = new JSDOM('<!DOCTYPE html>');
const window = td.replace('./lib/window', dom.window);
const cookie = td.replace('./lib/cookie', {
  get: td.function('cookie.get'),
  set: td.function('cookie.set'),
  remove: td.function('cookie.remove'),
});
// const utils = td.replace('./lib/utils');

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

  test('[datalayer.testMode] should activate if URL contains __odltest__=1', (t) => {
    dom.reconfigure({ url: 'http://example.com?__odltest__=1' });
    const dal = new module.Datalayer();
    dal.initialize({ data: globalDataMock });
    t.ok(dal.inTestMode(), 'inTestMode() should return true');
    t.end();
  });

  test('[datalayer.testMode] should set cookie if URL contains __odltest__=1', (t) => {
    dom.reconfigure({ url: 'http://example.com?__odltest__=1' });
    const dal = new module.Datalayer();
    dal.initialize({ data: globalDataMock });
    td.verify(cookie.set('__odltest__'), { ignoreExtraArgs: true });
    t.end();
  });

  test('[datalayer.testMode] should disable testmode and remove cookie if URL contains __odltest__=0', (t) => {
    dom.reconfigure({ url: 'http://example.com?__odltest__=0' });
    td.when(cookie.get('__odltest__')).thenReturn('1');
    const dal = new module.Datalayer();
    dal.initialize({ data: globalDataMock });
    td.verify(cookie.remove('__odltest__', td.matchers.anything()));
    t.notOk(dal.inTestMode(), 'odl.inTestMode should return false');
    t.end();
  });

  test('[datalayer.testMode] should load a specified plugin, if: testmode is active, the mode evaluates to "test" and the rule evaluates to "true"', (t) => {
    dom.reconfigure({ url: 'http://example.com?__odltest__=1' });
    const dal = new module.Datalayer();
    dal.initialize({
      data: globalDataMock,
      plugins: [
        { type: MockPlugin, rule: () => true, test: true },
      ],
    });
    dal.whenReady().then(() => {
      t.isNot(dal.getPluginById('test/mockPlugin', null));
      t.end();
    });
  });

  test('datalayer', (t) => {
    t.ok(typeof datalayer === 'object', 'should be an object');
    t.end();
  });

  test('datalayer.initialize', (t) => {
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
    t.end();
  });

  test('[datalayer.whenReady] should resolve when called BEFORE initialize', (t) => {
    const dal = new module.Datalayer();
    dal.whenReady().then(() => {
      t.ok(dal.isReady(), '[datalayer.isReady()] should be true');
      t.end();
    });
    dal.initialize({ data: globalDataMock });
  });

  test('[datalayer.whenReady] should resolve when called AFTER initialize', (t) => {
    const dal = new module.Datalayer();
    dal.initialize({ data: globalDataMock });
    dal.whenReady().then(() => {
      t.ok(dal.isReady(), '[datalayer.isReady()] should be true');
      t.end();
    });
  });
});
