/* eslint-disable max-len, no-new */
import { JSDOM } from 'jsdom';

// properly define implicit globals
const {
  describe,
  it,
  beforeEach,
  expect,
} = global;

describe('metadata', () => {
  let [metadata, datalayerMock, dom] = [];

  beforeEach(() => {
    // stub dependencies
    dom = new JSDOM('<!DOCTYPE html>');
    global.window = dom.window;
    global.document = window.document;

    datalayerMock = {
      broadcast: jest.fn(),
    };
    return import('./metadata.js').then((m) => {
      metadata = m;
    });
  });

  describe('module', () => {
    it('should export a factory which returns the extension class', () => {
      expect(typeof metadata.default()).toBe('function');
    });
  });

  describe('extension factory', () => {
    it('should collect, aggregate and return "d7r:data" metatags when calling "beforeInitialize"', () => {
      const ExtensionClass = metadata.default();
      const data = { data: { foo: 'bar', numberProp2: 42 } };
      window.document.querySelector('body').innerHTML = `<meta name="d7r:data" content='${JSON.stringify(data)}' />`;

      const extension = new ExtensionClass(datalayerMock);

      expect(extension.beforeInitialize()).toEqual(data);
    });

    it('should broadcast events found in "d7r:event" metatags when calling "beforeParseDOMNode"', () => {
      const ExtensionClass = metadata.default();
      const eventData = { name: 'my-event', data: { foo: 'bar', numberProp2: 42 } };
      window.document.querySelector('body').innerHTML = `<meta name="d7r:event" content='${JSON.stringify(eventData)}' />`;
      const extension = new ExtensionClass(datalayerMock);

      extension.beforeParseDOMNode(window.document);

      expect(datalayerMock.broadcast).toHaveBeenCalledWith(eventData.name, eventData.data);
    });
  });
});
