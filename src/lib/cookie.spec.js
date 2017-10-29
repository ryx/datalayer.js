import { test } from 'tap';
import td from 'testdouble';
import { JSDOM } from 'jsdom';

// stub dependencies
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const window = td.replace('./window', dom.window);

import('./cookie').then((module) => {
  const cookie = module.default;

  test('get', (t) => {
    t.test('should get a cookie with a given name and return its value', (st) => {
      window.document.cookie = 'foo=bar';
      window.document.cookie = 'test=3598235';
      st.is(cookie.get('foo'), 'bar');
      st.is(cookie.get('test'), '3598235');
      st.end();
    });

    t.end();
  });

  test('set', (t) => {
    t.test('should set a cookie with a given name to a given value', (st) => {
      cookie.set('xyz', 'foofoofoo');
      t.ok(window.document.cookie.indexOf('xyz=foofoofoo') > -1);
      st.end();
    });

    t.test('should restrict a cookie to a given path using options.path', (st) => {
      cookie.set('xyz', 'foofoofoo', { path: '/' });
      console.log('T', window.document.cookie);
      t.ok(window.document.cookie.indexOf('xyz=foofoofoo;path=/') > -1);
      st.end();
    });

    t.test('should restrict a cookie to a given domain using options.domain', (st) => {
      cookie.set('xyz', 'foofoofoo', { domain: 'foo.bar.com' });
      t.ok(window.document.cookie.indexOf('xyz=foofoofoo;domain=foo.bar.com') > -1);
      st.end();
    });

    t.test('should set the max-age of a cookie using options.maxAge', (st) => {
      cookie.set('xyz', 'foofoofoo', { maxAge: 123456 });
      t.ok(window.document.cookie.indexOf('xyz=foofoofoo;max-age=123456') > -1);
      st.end();
    });

    t.test('should set the expiry date of a cookie using options.expires', (st) => {
      cookie.set('xyz', 'foofoofoo', { expires: '2016-12-22T00:00:00' });
      t.ok(window.document.cookie.indexOf('xyz=foofoofoo;expires=2016-12-22T00:00:00') > -1);
      st.end();
    });
  });

  test('remove', (t) => {
    t.test('should remove a cookie with a given name', (st) => {
      window.document.cookie = 'foo=bar;';
      cookie.remove('foo');
      t.ok(window.document.cookie.indexOf('foo=null;') > -1);
      st.end();
    });
  });
});
