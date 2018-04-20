import { debug } from '../../datalayer';

/**
 * Offical datalayer.js core extension that works on any given call to
 * datalayer.beforeParseDOMNode and parses the provided node for existing
 * event annotations. The annotations follow a simple syntax and can be
 * provided via a `data-d7r-event-*` attribute.
 *
 * Copyright (c) 2016 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export default (config = { attributePrefix: 'd7r' }) => class Annotations {
  constructor(datalayer) {
    this.datalayer = datalayer;
    // init prerequisites
    // ...
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
   *
   * @param {HTMLElement} element  HTML element to initialize the callback for
   * @param {String} type event type
   * @param {Function} callback function to be called when event is fired
   */
  static initializeAnnotationCallback(element, type, callback) {
    const elements = element.querySelectorAll(`[data-${config.attributePrefix}-event-${type}]`);
    debug(`Annotations.initializeAnnotationCallback: looking for type "${type}"`, elements);
    if (elements) {
      // @XXX use `for` because `elements` is NO real Array in IE, so forEach might break
      for (let i = 0; i < elements.length; i += 1) {
        callback(elements[i]);
      }
    }
  }

  // handle element scan (called before/after scanElementFor*)
  beforeParseDOMNode(element) {
    debug('Annotations.beforeParseDOMNode');
    Annotations.initializeAnnotationCallback(element, 'click', (el) => {
      const eventData = el ? el.getAttribute(`data-${config.attributePrefix}-event-click`) : null;
      if (eventData) {
        this.parseAndBroadcastJSON(eventData);
      }
    });
    Annotations.initializeAnnotationCallback(element, 'view', (el) => {
      const eventData = el ? el.getAttribute(`data-${config.attributePrefix}-event-view`) : null;
      if (eventData) {
        this.parseAndBroadcastJSON(eventData);
      }
    });
  }
};
