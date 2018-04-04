/* eslint-disable max-len, no-new */
import { JSDOM } from 'jsdom';

const {
  describe,
  it,
  beforeEach,
  expect,
} = global;

describe('annotations', () => {
  let [annotations, datalayerMock, dom] = [];

  beforeEach(() => {
    // stub dependencies
    dom = new JSDOM('<!DOCTYPE html>');
    global.window = dom.window;
    global.document = window.document;

    datalayerMock = {
      broadcast: jest.fn(),
    };
    return import('./annotations.js').then((m) => {
      annotations = m;
    });
  });

  describe('module:', () => {
    it('should export a factory which returns the extension class', () => {
      expect(typeof annotations.default()).toBe('function');
    });
  });
});
