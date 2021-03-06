/* eslint-disable max-len, no-new */
import annotations from './annotations';

jest.mock('../../datalayer');

describe('annotations', () => {
  let [datalayerMock] = [];

  beforeEach(() => {
    datalayerMock = {
      broadcast: jest.fn(),
      log: jest.fn(),
    };
  });

  describe('module', () => {
    it('should export a factory which returns the extension class', () => {
      expect(typeof annotations()).toBe('function');
    });
  });

  describe('extension factory', () => {
    describe('eventType: load', () => {
      it('should collect "load" event annotations and immediately fire their callbacks in "beforeParseDOMNode"', () => {
        const ExtensionClass = annotations();
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
      let [event, extension] = [];

      beforeEach(() => {
        const ExtensionClass = annotations();
        event = { name: 'click-test', data: { foo: 'bar' } };
        window.document.body.innerHTML = `
          <div id="test-click" data-d7r-event-click='${JSON.stringify(event)}'>Click event</div>
        `;

        extension = new ExtensionClass(datalayerMock);
      });

      it('should collect "click" event annotations and hook up the associated callbacks in "beforeParseDOMNode"', () => {
        extension.beforeParseDOMNode(window.document.body);
        expect(datalayerMock.broadcast).not.toHaveBeenCalledWith(event.name, event.data);

        window.document.querySelector('#test-click').click();

        // @XXX: should be fired when element is clicked
        expect(datalayerMock.broadcast).toHaveBeenCalledWith(event.name, event.data);
      });

      it('should add a special "data-d7r-done" attribute when parsing annotations', () => {
        const annotatedEl = window.document.querySelector('#test-click');

        extension.beforeParseDOMNode(window.document.body);

        expect(annotatedEl.hasAttribute('data-d7r-wired')).toBe(true);
      });

      it('should only handle an annotation once per element, even if it is parsed multiple times', () => {
        extension.beforeParseDOMNode(window.document.body);
        extension.beforeParseDOMNode(window.document.body);
        extension.beforeParseDOMNode(window.document.body);

        expect(datalayerMock.broadcast).not.toHaveBeenCalledWith(event.name, event.data);
        window.document.querySelector('#test-click').click();

        expect(datalayerMock.broadcast).toHaveBeenCalledTimes(1);
      });

      it('should NOT add the "click" handling to the parent element', () => {
        extension.beforeParseDOMNode(window.document.body);

        window.document.querySelector('#test-click').parentNode.click();

        // @XXX: should be fired when element is clicked
        expect(datalayerMock.broadcast).not.toHaveBeenCalledWith(event.name, event.data);
      });
    });

    describe('eventType: view', () => {
      it('should NOT initialize view event tracking if not explictly enabled', () => {
        window.IntersectionObserver = jest.fn();
        const ExtensionClass = annotations();

        new ExtensionClass();

        expect(window.IntersectionObserver).not.toHaveBeenCalled();
      });

      it('should initialiize view event tracking if explictly enabled', () => {
        window.IntersectionObserver = jest.fn();
        const ExtensionClass = annotations({ enableViewEvents: true });

        new ExtensionClass();

        expect(window.IntersectionObserver).toHaveBeenCalled();
      });
      // @FIXME view event tracking can only be done in a functional testing setup
      // because JSDOM doesn't do any rendering
      /*
      it('should immediately fire events for an already visible element', () => {
        const ExtensionClass = annotations();
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
        const ExtensionClass = annotations();
        const event = { name: 'cmoing-into-view-test', data: { foo: 'bar' } };
        window.document.body.innerHTML = `
          <div style="margin-top:10000px" data-d7r-event-view='${JSON.stringify(event)}'>Not visible</div>
        `;

        const extension = new ExtensionClass(datalayerMock);
        extension.beforeParseDOMNode(window.document.body);

        // @XXX: should be fired as soon as element becomes visible
        expect(datalayerMock.broadcast).not.toHaveBeenCalledWith(event.name, event.data);
      });
      */
    });

    it('should throw an error when encountering an invalid event type', () => {
      const ExtensionClass = annotations();
      const extension = new ExtensionClass(datalayerMock);

      extension.initializeAnnotationCallback(window.document.body, 'foo', () => {});

      expect(extension.initializeAnnotationCallback).toThrow();
    });

    it('should NOT throw (but log error instead) when encountering invalid JSON', () => {
      const ExtensionClass = annotations();
      window.document.body.innerHTML = '<div id="test-click" data-d7r-event-click="ka-boom ...">I will explode</div>';

      const extension = new ExtensionClass(datalayerMock);
      extension.beforeParseDOMNode(window.document.body);
      window.document.querySelector('#test-click').click();

      expect(datalayerMock.broadcast).not.toThrow();
      expect(datalayerMock.log).toHaveBeenCalledWith(expect.stringMatching('invalid JSON'), 'ka-boom ...', expect.anything());
    });
  });
});
