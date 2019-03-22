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
import Extension from '../../Extension';

export default (config = {}) => class Logger extends Extension {
  constructor(datalayer) {
    super('Logger', datalayer);
    datalayer.logger = config.logger || new SimpleLogger('[d7r]');
  }
};
