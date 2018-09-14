/* eslint-disable class-methods-use-this */
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
import cookie from './lib/cookie';
import EventQueue from './lib/queue';
import Logger from './lib/Logger';

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
    this.globalConfig = {}; // configuration object (passed via odl:config)
    this.testModeActive = this.isTestModeActive();
    this.plugins = []; // array with loaded plugins
    this.extensions = []; // array with loaded extensions
    this.queue = new EventQueue();

    this.logger = new Logger('[d7r]');
    this.log('debugging enabled');

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
    throw new Error('.getPluginById called before .initialize (always wrap in whenReady())');
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
        return subscriber.shouldReceiveEvent(this.globalData);
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
  parseDOMNode(node) {
    this.log('parseDOMNode: parsing node', node);
    this.triggerExtensionHook('beforeParseDOMNode', node);
  }

  /**
   * Add the given plugin instance to internal list and subscribe it to the event
   * queue, then broadcast event history to it.
   * @param {Object} plugin  reference to the plugin instance
   */
  addPlugin(plugin) {
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
      // @XXX: remove and allow multi-init (should simply have no negative impact!)
      console.warn('already initialized');
      return false;
    }

    // validate options
    const data = options.data || {};

    // set config (@TODO: also collect config from markup here!)
    this.globalConfig = options.config || {};

    // collect global data from options and extensions
    this.globalData = extend({}, data);
    this.log('initialize: global data is', this.globalData);
    const initializeHookResult = this.triggerExtensionHook('beforeInitialize');
    initializeHookResult.forEach(r => extend(this.globalData, typeof r !== 'undefined' ? r : {}));
    if (!this.globalData) {
      throw new Error('Supplied DALGlobalData is invalid or missing');
    }
    this.log('initialize: extension hooks complete');

    // validate mandatory data (@TODO: we might use a model-based validation here somewhen)
    const gd = this.globalData;
    if (!gd.page || !gd.page.type || !gd.page.name) {
      throw new Error('Supplied DALPageData is invalid or missing');
    }
    if (!gd.site || !gd.site.id) {
      throw new Error('Supplied DALSiteData is invalid or missing');
    }
    this.log('initialize: collected data', this.globalData);

    // add provided plugins
    const plugins = options.plugins || [];
    this.log('initialize: loading plugins', plugins);
    if (plugins) {
      plugins.forEach(plugin => this.addPlugin(plugin));
      this.log('initialize: plugins loaded', plugins);
    }

    // core initialization is ready, broadcast 'initialize' event and resolve "whenReady" promise
    this.initialized = true;

    if (plugins) {
      // @FIXME: wait with initialize until some dedicated event happened?
      // plugins.forEach(plugin => typeof plugin.initialize === 'function' && plugin.initialize());
      this.broadcast('initialized');
      this.log('initialize: plugins initialized', plugins);
    }

    this.readyPromiseResolver();

    // parse DOM and trigger extensions hooks
    this.log('initialize: scanning DOM');
    this.parseDOMNode(window.document);

    return this;
  }

  inTestMode() {
    return this.testModeActive === true;
  }

  isReady() {
    return this.initialized === true;
  }

  /**
   * Handle and (un-/)persist test mode for plugin delivery.
   * @TODO: port and use persistentURLParam from DAL
   */
  isTestModeActive() {
    // this.log(window.location.search);
    if (cookie.get('__d7rtest__')) {
      this.log('isTestModeActive: cookie found');
      if (window.location.search.match(/__d7rtest__=0/gi)) {
        this.log('isTestModeActive: removing cookie');
        cookie.remove('__d7rtest__', { path: '/' });
        return false;
      }
      return true;
    } else if (window.location.search.match(/__d7rtest__=1/gi)) {
      cookie.set('__d7rtest__', '1', { path: '/', maxAge: 3600 * 24 * 7 });
      return true;
    }
    return false;
  }
}

// create new datalayer singleton instance
const datalayer = new Datalayer();

// XXX: store datalayer reference in window (currently needed for functionally testing plugins)
window._d7r = datalayer;

export default datalayer;
