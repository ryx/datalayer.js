/**
 * Simple logging helper that tunnels logging information to console. Allows
 * globally enabling and disabling the log output via a dedicated global flag.
 */
export default class Logger {
  constructor(prefix = '') {
    this.prefixStr = `${prefix}`;
  }

  log(...args) {
    if (Logger.prototype.ENABLED) {
      /* eslint-disable no-console, prefer-spread */
      console.log.apply(window.console, [this.prefixStr].concat(Array.prototype.slice.call(args)));
      /* eslint-enable no-console, prefer-spread */
    }
  }

  static enable(persist = true) {
    Logger.prototype.ENABLED = true;
    if (persist) {
      localStorage.setItem('d7r:logger:enable', '1');
    }
  }
}
Logger.prototype.ENABLED = localStorage.getItem('d7r:logger:enable') === '1';
