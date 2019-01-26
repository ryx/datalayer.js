/**
 *        __      __        __                          _
 *   ____/ /___ _/ /_____ _/ /___ ___  _____  _____    (_)____
 *  / __  / __ `/ __/ __ `/ / __ `/ / / / _ \/ ___/   / / ___/
 * / /_/ / /_/ / /_/ /_/ / / /_/ / /_/ /  __/ /  _   / (__  )
 * \__,_/\__,_/\__/\__,_/_/\__,_/\__, /\___/_/  (_)_/ /____/
 *                              /____/           /___/
 *
 * Copyright (c) 2016 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { extend } from './lib/utils';
import EventQueue from './lib/queue';

/**
 * The global Datalayer class, gets instantiated as singleton.
 * The datalayer is responsible for aggregating, providing and loading
 * plugins. The data is then passed to available plugins which can feed
 * it to external and/or third-party plugins.
 */
export class Datalayer {
  constructor() {
    this.initialized = false; // "ready" flag (true, if all plugins are loaded)
    this.globalData = {}; // data storage
    this.plugins = []; // array with loaded plugins
    this.extensions = []; // array with loaded extensions
    this.queue = new EventQueue();
    this.logger = { log: () => {} }; // default logger stub

    // create Promise reflecting readiness
    this.readyPromiseResolver = null;
    this.readyPromiseRejector = null;
    this.readyPromise = new Promise((resolve, reject) => {
      this.readyPromiseResolver = resolve;
      this.readyPromiseRejector = reject;
    });
  }

  /**
   * Returns Promise that is resolved as soon as the Datalayer is ready (i.e. initialized,
   * plugins loaded, basics set up).
   * @returns {Promise}
   */
  whenReady() {
    return this.readyPromise;
  }

  /**
   * Load and use the given extension.
   * @param {Object} extension datalayer extension class object (as returned by factory method)
   * @returns {Datalayer} the current instance
   */
  use(ExtensionClass) {
    const instance = new ExtensionClass(this);
    this.extensions.push(instance);
    return this;
  }

  /**
   * Log a dynamic number of arguments using the internal logging helper.
   * @param  {...any} args dynamic number of arguments to be logged
   */
  log(...args) {
    this.logger.log(...args);
  }

  /**
   * Trigger an extension hook with the given name and the given arguments. Causes all extensions
   * to receive the given hook and addtional parameters.
   * @param {String} name name of hook to be executed
   * @param {*} rest rest parameters
   * @returns {Array} array with return values of all extension hook calls
   */
  triggerExtensionHook(name, ...rest) {
    this.log(`triggerExtensionHook: triggering extension hook "${name}"`);
    const result = [];
    for (let i = 0; i < this.extensions.length; i += 1) {
      const extension = this.extensions[i];
      if (typeof extension[name] === 'function') {
        result.push(extension[name](...rest));
      }
    }
    this.log('triggerExtensionHook result:', result);
    return result;
  }

  /**
   * Returns the global data that came from one of the following sources:
   * a) it was passed to `.initialize` via configuration
   * b) it was collected and aggregated from the entire page by `.initialize`
   * c) it was manually passed as data to the last "page-loaded" event
   * @returns {Object} object with global data
   */
  getData() {
    if (this.initialized) {
      return this.globalData;
    }
    throw new Error('.getData called before .initialize (always wrap in whenReady())');
  }

  /**
   * Returns a plugin instance by the id that was assigned via config.
   * @param  {String}  pluginID     the id of the requested plugin
   */
  getPluginByID(pluginID) {
    if (this.initialized) {
      for (let i = 0; i < this.plugins.length; i += 1) {
        if (this.plugins[i].getID() === pluginID) {
          return this.plugins[i];
        }
      }
      return null;
    }
    throw new Error('.getPluginByID called before .initialize (always wrap in whenReady())');
  }

  /**
   * Broadcast a public event to all loaded plugins.
   * @param  {String}  name  the event name/type to be fired (e.g. 'load', 'addtocart', ...)
   * @param  {Object}  data  the event data to pass along with the event, may be of any type
   */
  broadcast(name, data) {
    this.log(`broadcasting event "${name}"`, data);
    this.queue.broadcastEvent(name, data, (subscriber) => {
      if (typeof subscriber.shouldReceiveEvent === 'function') {
        return subscriber.shouldReceiveEvent(name, data);
      }
      return true;
    });
  }

  /**
   * Parse a given DOM node. Passes the given node to an extension hook named
   * `beforeParseDOMNode`. Extensions can then do whatever they want, e.g. parse
   * the node for metadata or other information.
   * @param {HTMLElement} node the DOM node to be parsed
   */
  parseDOMNode(node = window.document) {
    this.log('parseDOMNode: parsing node', node);
    this.triggerExtensionHook('beforeParseDOMNode', node);
  }

  /**
   * Add the given plugin instance to internal list and subscribe it to the event
   * queue, then broadcast event history to it.
   * @param {datalayerjs.Plugin} plugin  reference to the plugin instance
   */
  addPlugin(plugin) {
    const addPluginHookResult = this.triggerExtensionHook('beforeAddPlugin', plugin);
    if (addPluginHookResult.filter(v => v === false).length > 0) {
      this.log('addPlugin: beforeAddPlugin returned false, skipping plugin', plugin);
      return;
    }
    // Lets introduce the datalayer instance to the plugin.
    plugin.setDataLayer(this);
    // add plugin , then broadcast all events that happened since initialization
    // @FIXME: add timestamp to events so plugins can decide to ignore old events
    this.plugins.push(plugin);
    this.queue.subscribe(plugin, true);
  }

  /**
   * Main initialization code. Sets up datalayer, loads plugins, handles execution.
   * @param  {Object}  options  configuration object, see documentation for details
   */
  initialize(options = {}) {
    if (this.initialized) {
      // @FIXME: remove and allow multi-init (should simply have no negative impact!)
      this.log('WARNING: already initialized');
      return false;
    }

    // validate options
    const data = options.data || {};

    // collect global data from options and extensions
    this.globalData = extend({}, data);
    this.log('initialize: global data is', this.globalData);
    const initializeHookResult = this.triggerExtensionHook('beforeInitialize');
    initializeHookResult.forEach(r => extend(this.globalData, typeof r !== 'undefined' ? r : {}));
    this.log('initialize: extension hooks complete');

    // add provided plugins
    const plugins = options.plugins || [];
    this.log('initialize: loading plugins', plugins);
    plugins.forEach(plugin => this.addPlugin(plugin));
    this.log('initialize: plugins loaded', plugins);

    // core initialization is ready, broadcast 'initialize' event and resolve "whenReady" promise
    this.initialized = true;

    // call user-provided validation callback for global data
    if (typeof options.validateData === 'function') {
      try {
        options.validateData(this.globalData);
      } catch (e) {
        // initialize failed, send error event with reason
        this.broadcast('initialize-failed', e);
        this.readyPromiseRejector(e);
        this.log('initialize: validation error', e);

        return this.readyPromise;
      }
    }

    // initialize successful
    this.broadcast('initialized', this.globalData);
    this.log('initialize: plugins initialized', plugins);
    this.readyPromiseResolver(this.globalData);

    // trigger post-initialize hook
    this.triggerExtensionHook('afterInitialize');

    // parse DOM and trigger extensions hooks
    this.log('initialize: scanning DOM');
    this.parseDOMNode(window.document);

    return this.readyPromise;
  }

  isReady() {
    return this.initialized === true;
  }
}

// create new datalayer singleton instance
const datalayer = new Datalayer();

export default datalayer;
