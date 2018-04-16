/* eslint-disable max-len, no-new */
import { debug } from '../../src/datalayer';

jest.mock('../../src/datalayer');

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
    debug.mockClear();
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
        <div id="test-click" data-d7r-event-click='${JSON.stringify(data)}'>Click event</div>
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
        <div id="test-view" data-d7r-event-view='${JSON.stringify(data)}'>Immediately visible</div>
      `;

      const extension = new ExtensionClass(datalayerMock);
      extension.beforeParseDOMNode(window.document.body);

      expect(datalayerMock.broadcast).toHaveBeenCalledWith('view-test', { foo: 'bar' });
    });

    it('should NOT throw (but log error instead) when encountering invalid JSON', () => {
      const ExtensionClass = annotations.default();
      window.document.body.innerHTML = '<div data-d7r-event-click="ka-boom ...">I will explode</div>';

      const extension = new ExtensionClass(datalayerMock);
      extension.beforeParseDOMNode(window.document.body);

      expect(datalayerMock.broadcast).not.toThrow();
      expect(debug).toHaveBeenCalledWith(expect.stringMatching('invalid JSON'), 'ka-boom ...', expect.anything());
    });
  });
});
