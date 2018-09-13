import { debug } from '../../datalayer';

/**
 * Offical datalayer.js core extension that works on any given call to
 * datalayer.beforeParseDOMNode and parses the provided node for existing
 * event annotations. The annotations follow a simple syntax and can be
 * provided via a `data-d7r-event-*` attribute.
 *
 * Copyright (c) 2018 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export default (config = { attributePrefix: 'd7r' }) => class Annotations {
  constructor(datalayer) {
    this.datalayer = datalayer;
    // init prerequisites
    // ...
    // @TODO init view tracking ...
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
  static initializeAnnotationCallback(targetElement, type, callback) {
    const elements = targetElement.querySelectorAll(`[data-${config.attributePrefix}-event-${type}]`);
    debug(`Annotations.initializeAnnotationCallback: looking for type "${type}"`, elements);
    if (elements) {
      // @XXX use `for` because `elements` is NO real Array in IE, so forEach might break
      for (let i = 0; i < elements.length; i += 1) {
        const currentElement = elements[i];
        if (type === 'load') {
          callback(currentElement);
        } else if (['focus', 'click'].indexOf(type) > -1) {
          currentElement.addEventListener(type, () => callback(currentElement));
        } else if (type === 'view') {
          console.error('view tracking not yet implemented in d7r.annotations');
        }
      }
    }
  }

  // handle element scan (@FIXME: d.r.y!)
  beforeParseDOMNode(element) {
    debug('Annotations.beforeParseDOMNode');
    Annotations.initializeAnnotationCallback(element, 'load', (el) => {
      const eventData = el ? el.getAttribute(`data-${config.attributePrefix}-event-load`) : null;
      if (eventData) {
        this.parseAndBroadcastJSON(eventData);
      }
    });
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
