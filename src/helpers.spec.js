/* eslint-disable max-len */
import { JSDOM } from 'jsdom';

const {
  describe,
  it,
  beforeEach,
  expect,
} = global;

// stub dependencies
const dom = new JSDOM('<!DOCTYPE html>');
global.window = dom.window;
global.document = window.document;

describe('helpers', () => {
  let [helpers] = [];

  beforeEach(() => import('./helpers').then((m) => { helpers = m; }));

  afterEach(() => {
    window.document.getElementsByTagName('HEAD')[0].innerHTML = '';
    window.document.getElementsByTagName('BODY')[0].innerHTML = '';
  });

  describe('addScript', () => {
    it('should append a script tag with a given source', () => {
      helpers.addScript('myTestURL.js');

      const script = window.document.querySelector('script[src="myTestURL.js"]');
      expect(script).toBeDefined();
      expect(script.tagName.toLowerCase()).toEqual('script');
      expect(script.src).toEqual('myTestURL.js');
    });

    it('should set the appended script tag as async if called without second argument', () => {
      helpers.addScript('myTestURL.js');

      const script = window.document.querySelector('script[src="myTestURL.js"]');
      expect(script).toBeDefined();
      expect(script.async).toBe(true);
    });

    it('should NOT set the appended script tag as async if called with false as second argument', () => {
      helpers.addScript('myTestURL.js', false);

      const script = window.document.querySelector('script[src="myTestURL.js"]');
      expect(script.async).toBe(false);
    });
  });

  describe('addHTML', () => {
    it('should append a given HTML string to a given element and return the element', () => {
      const expectation = '<foo>bar</foo>';
      const myEl = document.createElement('div');

      helpers.addHTML(myEl, expectation);

      const addedEl = myEl.querySelector('foo');
      expect(addedEl).toBeDefined();
      expect(addedEl.innerHTML).toEqual('bar');
    });

    it('should accept a string as first parameter and append a given HTML string to the resulting element', () => {
      const expectation = 'test content';

      helpers.addHTML('BODY', expectation);

      expect(window.document.body.innerHTML).toEqual(expectation);
    });

    it('should return false if first element is falsy', () => {
      expect(helpers.addHTML(null, 'test')).toBe(false);
    });
  });

  describe('addImage', () => {
    it('should append a given HTML image tag to a given element and return the element', () => {
      helpers.addImage('someurl/foo/bar');

      const imgEl = window.document.querySelector('img[src="someurl/foo/bar"]');

      expect(imgEl).not.toBe(null);
      expect(imgEl.getAttribute('width')).toEqual('1');
      expect(imgEl.getAttribute('height')).toEqual('1');
    });

    it('should add an img tag with [width=42,height=42] if URL and images sizes are supplied', () => {
      helpers.addImage('someurl/foo/bar', 42, 44);

      const imgEl = window.document.querySelector('img[src="someurl/foo/bar"]');

      expect(imgEl).not.toBe(null);
      expect(imgEl.getAttribute('width')).toEqual('42');
      expect(imgEl.getAttribute('height')).toEqual('44');
    });
  });
});
