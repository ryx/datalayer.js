/**
 * Offical datalayer.js core extension that works on any given call to
 * datalayer.scanElement and parses the provided DOM node for existing
 * event annotations. The annotations follow a simple syntax and can be
 * provided via a `data-dtlr-event-*` attribute.
 */
export default (config = {}) => class Annotations {
  constructor(datalayer) {
    this.datalayer = datalayer;
    // init prerequisites
    // ...
  }

  /**
   * Helper that calls DAL.broadcast with a given JSON string (parsed to object first).
   */
  parseAndBroadcastJSON(jsonString) {
    try {
      const o = JSON.parse(jsonString);
      this.datalayer.broadcast(o.name, o.data);
    } catch (e) {
      console.error('Error: invalid JSON provided for broadcast', jsonString, e);
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
    // @XXX use `for` because `elements` is NO real Array in IE, so forEach might break
    if (elements) {
      for (let i = 0; i < elements.length; i += 1) {
        callback(elements[i]);
      }
    }
  }

  // handle element scan (called before/after scanElementFor*)
  beforeScanElement(element) {
    Annotations.initializeAnnotationCallback(element, 'click', (e) => {
      const str = e && e.currentTarget ? e.currentTarget.getAttribute(`data-${config.attributePrefix}-event-click`) : null;
      if (str) {
        this.parseAndBroadcastJSON(str);
      }
    });
    Annotations.initializeAnnotationCallback(element, 'view', (e) => {
      const str = e && e.currentTarget ? e.currentTarget.getAttribute(`data-${config.attributePrefix}-event-view`) : null;
      if (str) {
        this.parseAndBroadcastJSON(str);
      }
    });
  }
};
