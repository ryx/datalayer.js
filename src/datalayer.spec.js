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

// process.env.DEBUG = true;

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
    dal.initialize(globalDataMock);
    t.ok(dal.inTestMode(), 'odl.inTestMode should return true');
    t.end();
  });

  test('[datalayer.testMode] should set cookie if URL contains __odltest__=1', (t) => {
    dom.reconfigure({ url: 'http://example.com?__odltest__=1' });
    const dal = new module.Datalayer();
    dal.initialize(globalDataMock);
    td.verify(cookie.set('__odltest__'), { ignoreExtraArgs: true });
    t.end();
  });

  test('[datalayer.testMode] should disable testmode and remove cookie if URL contains __odltest__=0', (t) => {
    dom.reconfigure({ url: 'http://example.com?__odltest__=0' });
    td.when(cookie.get('__odltest__')).thenReturn('1');
    const dal = new module.Datalayer();
    dal.initialize(globalDataMock);
    td.verify(cookie.remove('__odltest__', td.matchers.anything()));
    t.notOk(dal.inTestMode(), 'odl.inTestMode should return false');
    t.end();
  });

  test('[datalayer.testMode] should load a supplied plugin, if: testmode is active, the mode evaluates to "test" and the rule evaluates to "true"', (t) => {
    dom.reconfigure({ url: 'http://example.com?__odltest__=1' });
    const dal = new module.Datalayer();
    dal.getPlugin = td.function(dal.getPlugin);
    dal.initialize(globalDataMock, { 'odl/plugins/mock': { test: true, rule: () => true } });
    td.verify(dal.getPlugin('odl/plugins/mock', td.matchers.anything()));
    t.end();
  });

  test('datalayer', (t) => {
    t.ok(typeof datalayer === 'object', 'should be an object');
    t.end();
  });

  test('datalayer.initialize', (t) => {
    t.plan(4);
    t.throws(
      () => datalayer.initialize(null, {}, {}),
      /No ODLGlobalData/gi,
      'should complain about missing page data',
    );
    t.throws(
      () => datalayer.initialize({ page: { } }, {}, {}),
      /ODLPageData is invalid or missing/gi,
      'should complain about invalid page data',
    );
    t.throws(
      () => datalayer.initialize({ page: globalDataMock.page }, {}, {}),
      /ODLSiteData is invalid or missing/gi,
      'should complain about missing site data',
    );
    // TODO: invalid site data
    t.throws(
      () => datalayer.initialize({ page: globalDataMock.page, site: globalDataMock.site }, {}, {}),
      /ODLUserData is invalid or missing/gi,
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
    dal.initialize(globalDataMock, {}, {});
  });

  test('[datalayer.whenReady] should resolve when called AFTER initialize', (t) => {
    const dal = new module.Datalayer();
    dal.initialize(globalDataMock, {}, {});
    dal.whenReady().then(() => {
      t.ok(dal.isReady(), '[datalayer.isReady()] should be true');
      t.end();
    });
  });
});
