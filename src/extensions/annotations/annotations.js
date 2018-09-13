import 'intersection-observer';
import { debug } from '../../datalayer';

/**
 * Offical datalayer.js core extension that works on any given call to
 * datalayer.beforeParseDOMNode and parses the provided node for existing
 * event annotations. The annotations follow a simple syntax and can be
 * provided via a `data-d7r-event-*` attribute.
 *
 * Available events are:
 * - 'load': element was loaded and is available in the DOM
 * - 'click': element was clicked by the user
 * - 'focus': element received the input focus (i.e. onblur)
 * - 'view': element became fully visible
 *
 * Copyright (c) 2018 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export default (config = { attributePrefix: 'd7r' }) => class Annotations {
  constructor(datalayer) {
    this.datalayer = datalayer;
    // init observer for element visibility tracking
    this.observer = new window.IntersectionObserver(
      entries => this.onIntersection(entries),
      {
        root: null,
        threshold: [1],
      }
    );
  }

  /**
   * Handle intersection of observed elements within the viewport.
   * @param {Array<IntersectionObserverEntry>} entries list with intersecting elements
   */
  onIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        debug('[Annotations] element in the view', entry.target);
        this.observer.unobserve(entry.target);
      }
    });
  }

  /**
   * Helper that calls datalayer.broadcast with a given JSON string (parsed to object first).
   */
  parseAndBroadcastJSON(jsonString) {
    debug('Annotations.parseAndBroadcastJSON:', jsonString);
    try {
      const o = JSON.parse(jsonString);
      this.datalayer.broadcast(o.name, o.data);
    } catch (e) {
      debug('Error: invalid JSON provided for broadcast', jsonString, e);
    }
  }

  /**
   * Initialize the correct event handling on targetElement for the given event type. Hooks
   * up the required logic so that callback
   * @param {HTMLElement} element  HTML element to initialize the callback for
   * @param {String} type event type
   * @param {Function} callback function to be called when event is fired
   */
  initializeAnnotationCallback(targetElement, eventType, callback) {
    const elements = targetElement.querySelectorAll(`[data-${config.attributePrefix}-event-${eventType}]`);
    debug(`Annotations.initializeAnnotationCallback: looking for type "${eventType}"`, elements);
    if (elements) {
      // @XXX use `for` because `elements` is NO real Array in IE, so forEach might break
      for (let i = 0; i < elements.length; i += 1) {
        const currentElement = elements[i];
        if (eventType === 'load') {
          callback(currentElement);
        } else if (['focus', 'click'].indexOf(eventType) > -1) {
          currentElement.addEventListener(eventType, () => callback(currentElement));
        } else if (eventType === 'view') {
          this.observer.observe(currentElement);
        } else {
          throw new Error(`Error: event type "${eventType}" is invalid`);
        }
      }
    }
  }

  /**
   * Called when datalayer.js parses a newly recognized DOM node (e.g. after parseDOMNode is called).
   */
  beforeParseDOMNode(element) {
    debug('Annotations.beforeParseDOMNode');
    // @FIXME this is not the ideal solution from a performance perspective
    ['load', 'focus', 'view', 'click'].forEach((type) => {
      this.initializeAnnotationCallback(element, type, (el) => {
        const eventData = el ? el.getAttribute(`data-${config.attributePrefix}-event-${type}`) : null;
        if (eventData) {
          this.parseAndBroadcastJSON(eventData);
        }
      });
    });
  }
};
