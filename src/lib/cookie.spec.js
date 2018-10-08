// properly define implicit globals
import cookie from './cookie';

// this is a very naive cookie implementation, because jsdom cookies suck badly
let gCookieStr = '';
Object.defineProperty(global.document, 'cookie', {
  set: (value) => {
    gCookieStr = `${gCookieStr} ${value};`;
  },
  get: () => gCookieStr,
});

describe('cookie', () => {
  describe('get', () => {
    it('should get a cookie with a given name and return its value', () => {
      window.document.cookie = 'foo=bar';
      window.document.cookie = 'test=3598235';
      expect(cookie.get('foo')).toEqual('bar');
      expect(cookie.get('test')).toEqual('3598235');
    });
  });

  describe('set', () => {
    it('should set a cookie with a given name to a given value', () => {
      cookie.set('xyz', 'foofoofoo');
      expect(window.document.cookie.indexOf('xyz=foofoofoo')).toBeGreaterThan(-1);
    });

    it('should restrict a cookie to a given path using options.path', () => {
      cookie.set('xyz', 'foofoofoo', { path: '/' });
      expect(window.document.cookie.indexOf('xyz=foofoofoo;path=/')).toBeGreaterThan(-1);
    });

    it('should restrict a cookie to a given domain using options.domain', () => {
      cookie.set('xyz', 'foofoofoo', { domain: 'foo.bar.com' });
      expect(window.document.cookie.indexOf('xyz=foofoofoo;domain=foo.bar.com')).toBeGreaterThan(-1);
    });

    it('should set the max-age of a cookie using options.maxAge', () => {
      cookie.set('xyz', 'foofoofoo', { maxAge: 123456 });
      expect(window.document.cookie.indexOf('xyz=foofoofoo;max-age=123456')).toBeGreaterThan(-1);
    });

    it('should set the expiry date of a cookie using options.expires', () => {
      cookie.set('xyz', 'foofoofoo', { expires: '2016-12-22T00:00:00' });
      expect(window.document.cookie.indexOf('xyz=foofoofoo;expires=2016-12-22T00:00:00')).toBeGreaterThan(-1);
    });
  });

  describe('remove', () => {
    it('should remove a cookie with a given name', () => {
      window.document.cookie = 'foo=bar;';
      cookie.remove('foo');
      expect(window.document.cookie.indexOf('foo=null;')).toBeGreaterThan(-1);
    });
  });
});
