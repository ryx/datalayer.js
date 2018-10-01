/* eslint-disable max-len */
import {
  addScript,
  addHTML,
  addImage,
} from './helpers';

describe('helpers', () => {
  afterEach(() => {
    window.document.getElementsByTagName('HEAD')[0].innerHTML = '';
    window.document.getElementsByTagName('BODY')[0].innerHTML = '';
  });

  describe('addScript', () => {
    it('should append a script tag with a given source', () => {
      addScript('myTestURL.js');

      const script = window.document.querySelector('script[src="myTestURL.js"]');
      expect(script).toBeDefined();
      expect(script.tagName.toLowerCase()).toEqual('script');
      expect(script.src).toEqual('myTestURL.js');
    });

    it('should set the appended script tag as async if called without second argument', () => {
      addScript('myTestURL.js');

      const script = window.document.querySelector('script[src="myTestURL.js"]');
      expect(script).toBeDefined();
      expect(script.async).toBe(true);
    });

    it('should NOT set the appended script tag to async if second argument is falsy', () => {
      addScript('myTestURL.js', false);

      const script = window.document.querySelector('script[src="myTestURL.js"]');
      expect(script.async).toBeFalsy();
    });

    /*
    it('should execute the given onLoad handler if passed as third argument', (done) => {
      const myCallback = () => {
        done();
      };

      const scriptEL = addScript('myTestURL.js', true, myCallback);

      scriptEl.onLoad
    });
    */
  });

  describe('addHTML', () => {
    it('should append a given HTML string to a given element and return the element', () => {
      const expectation = '<foo>bar</foo>';
      const myEl = document.createElement('div');

      addHTML(myEl, expectation);

      const addedEl = myEl.querySelector('foo');
      expect(addedEl).toBeDefined();
      expect(addedEl.innerHTML).toEqual('bar');
    });

    it('should accept a string as first parameter and append a given HTML string to the resulting element', () => {
      const expectation = 'test content';

      addHTML('BODY', expectation);

      expect(window.document.body.innerHTML).toEqual(expectation);
    });

    it('should return false if first element is falsy', () => {
      expect(addHTML(null, 'test')).toBe(false);
    });
  });

  describe('addImage', () => {
    it('should append a given HTML image tag to a given element and return the element', () => {
      addImage('someurl/foo/bar');

      const imgEl = window.document.querySelector('img[src="someurl/foo/bar"]');

      expect(imgEl).not.toBe(null);
      expect(imgEl.getAttribute('width')).toEqual('1');
      expect(imgEl.getAttribute('height')).toEqual('1');
    });

    it('should add an img tag with [width=42,height=42] if URL and images sizes are supplied', () => {
      addImage('someurl/foo/bar', 42, 44);

      const imgEl = window.document.querySelector('img[src="someurl/foo/bar"]');

      expect(imgEl).not.toBe(null);
      expect(imgEl.getAttribute('width')).toEqual('42');
      expect(imgEl.getAttribute('height')).toEqual('44');
    });
  });
});
