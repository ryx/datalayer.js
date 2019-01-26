/* eslint-disable class-methods-use-this, no-unused-vars */
import {
  addScript,
  addHTML,
  addImage,
} from './helpers';

/**
 * Baseclass for datalayer.js plugins.
 */
export default class Plugin {
  /**
   * Create a new Plugin instance. Child classes have to explicitly set the id
   * and pass through any additional arguments to the superconstructor.
   * @param {String} id unique identifier
   * @param {?Object} config configuration object
   * @param {?Function} rules optional rules callback, see documentation for more info
   */
  constructor(id, config = {}, _rulesCallback = null) {
    this.id = id;
    this.config = config;
    this._rulesCallback = _rulesCallback;
    this.datalayer = { log: () => {} };
  }

  /**
   * Internal function to introduce the datalayer to the plugin.
   * @param {Datalayer} Instance of datalayer.js
   */
  setDataLayer(layer) {
    this.datalayer = layer;
  }

  /**
   * Return this plugin's unique ID as defined within class constructor. It is worth to mention that
   * this ID is the same for all instances of this plugin. Instance-specific IDs have to be handled
   * by the plugin implementation itself.
   * @returns {String}  unique ID for this plugin
   */
  getID() {
    return this.id;
  }

  /**
   * Decides whether this plugin will receive events within the current execution context.
   * The decision about load handling is done by the plugin to keep the config short and
   * clean. However, the datalayer configuration can overrule the plugin's default and
   * prohibit data access whenever necessary.
   * @param {Object} data  the current data object for the current page context (should comply with data model)
   */
  shouldReceiveEvent(name, data) {
    return typeof this._rulesCallback === 'function' ? this._rulesCallback(name, data) : true;
  }

  /**
   * Main event handling callback.
   * @param {string} name of event to be handled
   * @param {any} data event data (type and structure depend on event type)
   */
  handleEvent(name, data) {}

  /**
   * Logging helper, using datalayer.js internal logging which can be easily toggled via
   * localStorage item.
   * @param  {...any} args send any given args to current log output
   */
  log(...args) {
    this.datalayer.log(`[${this.id}]`, ...args);
  }

  addScript(src, async, onLoad) {
    addScript(src, async, onLoad);
  }

  // @TODO: add utility methods from old pixelHelper ...
}
