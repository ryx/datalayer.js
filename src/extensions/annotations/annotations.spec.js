/* eslint-disable max-len, no-new */
import { debug } from '../../datalayer';

jest.mock('../../datalayer');

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
    describe('eventType: load', () => {
      it('should collect "load" event annotations and immediately fire their callbacks in "beforeParseDOMNode"', () => {
        const ExtensionClass = annotations.default();
        const event = { name: 'load-test', data: { foo: 'bar' } };
        window.document.body.innerHTML = `
          <div data-d7r-event-load='${JSON.stringify(event)}'>Immediately executed</div>
        `;

        const extension = new ExtensionClass(datalayerMock);
        expect(datalayerMock.broadcast).not.toHaveBeenCalledWith(event.name, event.data);
        extension.beforeParseDOMNode(window.document.body);

        // @XXX: should be fired as soon as annotation is parsed
        expect(datalayerMock.broadcast).toHaveBeenCalledWith(event.name, event.data);
      });
    });

    describe('eventType: click', () => {
      it('should collect "click" event annotations and hook up the associated callbacks in "beforeParseDOMNode"', () => {
        const ExtensionClass = annotations.default();
        const event = { name: 'click-test', data: { foo: 'bar' } };
        window.document.body.innerHTML = `
          <div id="test-click" data-d7r-event-click='${JSON.stringify(event)}'>Click event</div>
        `;

        const extension = new ExtensionClass(datalayerMock);
        extension.beforeParseDOMNode(window.document.body);
        expect(datalayerMock.broadcast).not.toHaveBeenCalledWith(event.name, event.data);
        window.document.querySelector('#test-click').click();

        // @XXX: should be fired when element is clicked
        expect(datalayerMock.broadcast).toHaveBeenCalledWith(event.name, event.data);
      });

      it('should NOT add the "click" handling to the parent element', () => {
        const ExtensionClass = annotations.default();
        const event = { name: 'click-test', data: { foo: 'bar' } };
        window.document.body.innerHTML = `
          <div id="test-click" data-d7r-event-click='${JSON.stringify(event)}'>Click event</div>
        `;

        const extension = new ExtensionClass(datalayerMock);
        extension.beforeParseDOMNode(window.document.body);
        window.document.querySelector('#test-click').parentNode.click();

        // @XXX: should be fired when element is clicked
        expect(datalayerMock.broadcast).not.toHaveBeenCalledWith(event.name, event.data);
      });
    });

    // @FIXME view event tracking can only be done in a functional testing setup
    // because JSDOM doesn't do any rendering
    /*
    describe.skip('eventType: view', () => {
      it('should immediately fire events for an already visible element', () => {
        const ExtensionClass = annotations.default();
        const event = { name: 'already-in-view-test', data: { foo: 'bar' } };
        window.document.body.innerHTML = `
          <div data-d7r-event-view='${JSON.stringify(event)}'>Immediately visible</div>
        `;

        const extension = new ExtensionClass(datalayerMock);
        extension.beforeParseDOMNode(window.document.body);

        // @XXX: should be fired as soon as element becomes visible
        expect(datalayerMock.broadcast).toHaveBeenCalledWith(event.name, event.data);
      });

      it('should NOT immedietaly fire events for a non-visible element', () => {
        const ExtensionClass = annotations.default();
        const event = { name: 'cmoing-into-view-test', data: { foo: 'bar' } };
        window.document.body.innerHTML = `
          <div style="margin-top:10000px" data-d7r-event-view='${JSON.stringify(event)}'>Not visible</div>
        `;

        const extension = new ExtensionClass(datalayerMock);
        extension.beforeParseDOMNode(window.document.body);

        // @XXX: should be fired as soon as element becomes visible
        expect(datalayerMock.broadcast).not.toHaveBeenCalledWith(event.name, event.data);
      });
    });
    */

    it('should throw an error when encountering an invalid event type', () => {
      const ExtensionClass = annotations.default();
      const extension = new ExtensionClass(datalayerMock);

      extension.initializeAnnotationCallback(window.document.body, 'foo', () => {});

      expect(extension.initializeAnnotationCallback).toThrow();
    });

    it('should NOT throw (but log error instead) when encountering invalid JSON', () => {
      const ExtensionClass = annotations.default();
      window.document.body.innerHTML = '<div id="test-click" data-d7r-event-click="ka-boom ...">I will explode</div>';

      const extension = new ExtensionClass(datalayerMock);
      extension.beforeParseDOMNode(window.document.body);
      window.document.querySelector('#test-click').click();

      expect(datalayerMock.broadcast).not.toThrow();
      expect(debug).toHaveBeenCalledWith(expect.stringMatching('invalid JSON'), 'ka-boom ...', expect.anything());
    });
  });
});
