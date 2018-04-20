/**
 * Offical datalayer.js core extension that parses the DOM for
 * special metatags with datalayer.js data and events.
 *
 * Copyright (c) 2016 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { debug } from '../../src/datalayer';

/**
 *  Helper method - extend object with other object
 */
export function extend(obj1, obj2) {
  const keys = Object.keys(obj2);
  for (let i = 0; i < keys.length; i += 1) {
    const val = obj2[keys[i]];
    let src;
    if (['string', 'number', 'boolean'].indexOf(typeof val) === -1 && typeof val.length === 'undefined') {
      src = extend(obj1[keys[i]] || {}, val);
    } else {
      src = val;
    }
    obj1[keys[i]] = src;
  }
  return obj1;
}

/**
 * Scan a given node (or the entire DOM) for metatags containing stringified JSON
 * and return the parsed and aggregated object. Returns false and logs an error message, if
 * any error occured (@TODO: use Promise return instead).
 *
 * @param {Object}  name  name value of the metatag to be collected
 * @param {Function}  callback  function to be called for each metadata item
 * (gets passed (optional) error message, element and parsed data object as arguments)
 * @param {String|HTMLElement}  context  (optional) any CSS selector or HTMLElement,
 * if defined it limits the lookup context to the given element
 * @param {Object}  data  initial data, gets extended with the collected data
 */
export function collectMetadata(name, callback, context = null, data = {}) {
  // get parent element to be queried (or use entire document as default)
  let parent = window.document;
  if (context) {
    parent = typeof context === 'string' ? window.document.querySelector(context) : context;
    if (!parent) {
      console.log(`collectMetadata: context with selector "${context}" not found`);
      return false;
    }
  }
  // collect metatags and build up data
  const metatags = parent.querySelectorAll(`meta[name="${name}"]`);
  if (metatags) {
    for (let i = 0; i < metatags.length; i += 1) {
      const el = metatags[i];
      let o = null;
      try {
        o = JSON.parse(el.getAttribute('content'));
      } catch (e) {
        callback(`collectMetadata: parse error ${e.message}: ${e}`);
        break;
      }
      extend(data, o);
      callback(null, el, o);
    }
  }
  return data;
}

export default (config = { metaPrefix: 'd7r:' }) => class Metadata {
  constructor(datalayer) {
    this.datalayer = datalayer;
    this.globalData = {};
  }

  beforeInitialize(element = window.document) {
    const md = collectMetadata(`${config.metaPrefix}data`, () => {}, element, this.globalData);
    debug(`Metadata.beforeInitialize: selector is "${config.metaPrefix}data"`, md);
    return md;
  }

  beforeParseDOMNode(element) {
    return collectMetadata(`${config.metaPrefix}event`, (err, _element, obj) => {
      if (err) {
        console.error(err);
        return;
      }
      if (!_element.hasAttribute('data-d7r-handled-event')) {
        _element.setAttribute('data-d7r-handled-event', 1);
        this.datalayer.broadcast(obj.name, obj.data);
      }
    }, element);
  }
};
