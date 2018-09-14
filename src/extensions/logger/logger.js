/**
 * Offical datalayer.js core extension that adds a customizable
 * logger instance to datalayer.js.
 *
 * Copyright (c) 2016 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import SimpleLogger from './SimpleLogger';

export default (config = {}) => class Logger {
  constructor(datalayer) {
    this.datalayer = datalayer;
    datalayer.logger = config.logger || new SimpleLogger('[d7r]');
  }
};
