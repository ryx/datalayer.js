/* eslint-disable max-len, no-new */

// properly define implicit globals
const {
  describe,
  it,
  beforeEach,
  expect,
} = global;

describe('annotations', () => {
  let [annotations, datalayerMock] = [];

  beforeEach(() => {
    datalayerMock = {
      broadcast: jest.fn(),
    };
    return import('./annotations.js').then((m) => {
      annotations = m;
    });
  });

  describe('module', () => {
    it('should export a factory which returns the extension class', () => {
      expect(typeof annotations.default()).toBe('function');
    });
  });

  describe('extension factory', () => {
    it('should collect "click" event annotations and hook up the associated callbacks in "beforeParseDOMNode"', () => {
      const ExtensionClass = annotations.default();
      const data = { name: 'click-test', data: { foo: 'bar' } };
      window.document.body.innerHTML = `
        <div id="test-click" data-dtlr-event-click='${JSON.stringify(data)}' />Click event</div>
      `;

      const extension = new ExtensionClass(datalayerMock);
      extension.beforeParseDOMNode(window.document.body);
      window.document.querySelector('#test-click').click();

      expect(datalayerMock.broadcast).toHaveBeenCalledWith('click-test', { foo: 'bar' });
    });

    it('should collect "view" event annotations and hook up the associated callbacks in "beforeParseDOMNode"', () => {
      const ExtensionClass = annotations.default();
      const data = { name: 'view-test', data: { foo: 'bar' } };
      window.document.body.innerHTML = `
        <div id="test-view" data-dtlr-event-view='${JSON.stringify(data)}' />Immediately visible</div>
      `;

      const extension = new ExtensionClass(datalayerMock);
      extension.beforeParseDOMNode(window.document.body);

      expect(datalayerMock.broadcast).toHaveBeenCalledWith('view-test', { foo: 'bar' });
    });
  });
});
