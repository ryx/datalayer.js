/**
 * Offical datalayer.js core extension that parses the DOM for
 * special metatags with datalayer.js data and events.
 *
 * Copyright (c) 2016 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { collectMetadata } from '../../lib/utils';

export default (config = {
  metaPrefix: 'd7r:',
  attributePrefix: 'd7r',
}) => class Metadata {
  constructor(datalayer) {
    this.datalayer = datalayer;
    this.globalData = {};
  }

  beforeInitialize(element = window.document) {
    const md = collectMetadata(`${config.metaPrefix}data`, () => {}, element, this.globalData);
    this.datalayer.log(`[Metadata.beforeInitialize] selector is "${config.metaPrefix}data"`, md);
    return md;
  }

  beforeParseDOMNode(element) {
    return collectMetadata(`${config.metaPrefix}event`, (err, _element, obj) => {
      if (err) {
        console.error(err);
        return;
      }
      if (!_element.hasAttribute(`data-${config.attributePrefix}-handled-event`)) {
        _element.setAttribute(`data-${config.attributePrefix}-handled-event`, 1);
        this.datalayer.broadcast(obj.name, obj.data);
      }
    }, element);
  }
};
