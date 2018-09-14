/**
 * Simple logging helper that tunnels logging information to console. Allows
 * globally enabling and disabling the log output via a dedicated global flag.
 *
 * Copyright (c) 2016 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export default class SimpleLogger {
  constructor(prefix = '') {
    this.prefixStr = `${prefix}`;
    SimpleLogger.prototype.ENABLED = window.localStorage.getItem('d7r:logger:enable') === '1';
  }

  log(...args) {
    if (SimpleLogger.prototype.ENABLED) {
      /* eslint-disable no-console, prefer-spread */
      console.log.apply(window.console, [this.prefixStr].concat(Array.prototype.slice.call(args)));
      /* eslint-enable no-console, prefer-spread */
    }
  }

  static enable(persist = true) {
    SimpleLogger.prototype.ENABLED = true;
    if (persist) {
      window.localStorage.setItem('d7r:logger:enable', '1');
    }
  }
}
