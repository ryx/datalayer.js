import { describe, it, beforeEach } from 'mocha';
import { assert } from 'chai';
import td from 'testdouble';
import { JSDOM } from 'jsdom';

// stub dependencies
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const window = td.replace('./window', dom.window);

describe('cookie', () => {
  let [cookie] = [];

  beforeEach(() => import('./cookie').then((m) => { cookie = m.default; }));

  describe('get', () => {
    it('should get a cookie with a given name and return its value', () => {
      window.document.cookie = 'foo=bar';
      window.document.cookie = 'test=3598235';
      assert.equal(cookie.get('foo'), 'bar');
      assert.equal(cookie.get('test'), '3598235');
    });
  });

  describe('set', () => {
    it('should set a cookie with a given name to a given value', () => {
      cookie.set('xyz', 'foofoofoo');
      assert.isTrue(window.document.cookie.indexOf('xyz=foofoofoo') > -1);
    });

    it('should restrict a cookie to a given path using options.path', () => {
      cookie.set('xyz', 'foofoofoo', { path: '/' });
      console.log('T', window.document.cookie);
      assert.isTrue(window.document.cookie.indexOf('xyz=foofoofoo;path=/') > -1);
    });

    it('should restrict a cookie to a given domain using options.domain', () => {
      cookie.set('xyz', 'foofoofoo', { domain: 'foo.bar.com' });
      assert.isTrue(window.document.cookie.indexOf('xyz=foofoofoo;domain=foo.bar.com') > -1);
    });

    it('should set the max-age of a cookie using options.maxAge', () => {
      cookie.set('xyz', 'foofoofoo', { maxAge: 123456 });
      assert.isTrue(window.document.cookie.indexOf('xyz=foofoofoo;max-age=123456') > -1);
    });

    it('should set the expiry date of a cookie using options.expires', () => {
      cookie.set('xyz', 'foofoofoo', { expires: '2016-12-22T00:00:00' });
      assert.isTrue(window.document.cookie.indexOf('xyz=foofoofoo;expires=2016-12-22T00:00:00') > -1);
    });
  });

  describe('remove', () => {
    it('should remove a cookie with a given name', () => {
      window.document.cookie = 'foo=bar;';
      cookie.remove('foo');
      assert.isTrue(window.document.cookie.indexOf('foo=null;') > -1);
    });
  });
});
