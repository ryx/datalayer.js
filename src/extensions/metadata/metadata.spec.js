/* eslint-disable max-len, no-new */
import metadata from './metadata';

describe('metadata', () => {
  let [datalayerMock] = [];

  beforeEach(() => {
    datalayerMock = {
      broadcast: jest.fn(),
      log: jest.fn(),
    };
  });

  describe('module', () => {
    it('should export a factory which returns the extension class', () => {
      expect(typeof metadata()).toBe('function');
    });
  });

  describe('extension factory', () => {
    it('should collect, aggregate and return "d7r:data" metatags when calling "beforeInitialize"', () => {
      const ExtensionClass = metadata();
      const data = { data: { foo: 'bar', numberProp2: 42 } };
      window.document.querySelector('body').innerHTML = `<meta name="d7r:data" content='${JSON.stringify(data)}' />`;

      const extension = new ExtensionClass(datalayerMock);

      expect(extension.beforeInitialize()).toEqual(data);
    });

    it('should broadcast events found in "d7r:event" metatags when calling "beforeParseDOMNode"', () => {
      const ExtensionClass = metadata();
      const eventData = { name: 'my-event', data: { foo: 'bar', numberProp2: 42 } };
      window.document.querySelector('body').innerHTML = `<meta name="d7r:event" content='${JSON.stringify(eventData)}' />`;
      const extension = new ExtensionClass(datalayerMock);

      extension.beforeParseDOMNode(window.document);

      expect(datalayerMock.broadcast).toHaveBeenCalledWith(eventData.name, eventData.data);
    });
  });
});
