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
// import window from './lib/window';
import { extend } from './lib/utils';
import cookie from './lib/cookie';
import EventQueue from './lib/queue';

// define window global
// const { window } = global;

// debugging helper
/* eslint-disable func-names, no-console, prefer-spread, prefer-rest-params */
const DEBUG = typeof process.env.DTLR_DEBUG !== 'undefined';
export function debug() {
  if (DEBUG) {
    console.log.apply(console, ['[debug]:'].concat(Array.prototype.slice.call(arguments)));
  }
}
/* eslint-enable func-names, no-console, prefer-spread, prefer-rest-params */

debug('debugging enabled');

/**
 * The global Datalayer class, gets instantiated as singleton.
 * The datalayer is responsible for aggregating, providing and loading
 * plugins. The data is then passed to available plugins which can feed
 * it to external and/or third-party plugins.
 */
export class Datalayer {
  constructor() {
    this.initialized = false; // "ready" flag (true, if all plugins are loaded)
    this.metaPrefix = 'dtlr:'; // prefix for meta[name] attribute
    this.globalData = {}; // data storage
    this.globalConfig = {}; // configuration object (passed via odl:config)
    this.testModeActive = this.isTestModeActive();
    this.plugins = []; // array with loaded plugins
    this.extensions = []; // array with loaded extensions
    this.queue = new EventQueue();

    // create promises
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
   * Trigger an extension hook with the given name and the given arguments. Causes all extensions
   * to receive the given hook and addtional parameters.
   * @param {String} name name of hook to be executed
   * @param {*} rest rest parameters
   * @returns {Array} array with return values of all extension hook calls
   */
  triggerExtensionHook(name, ...rest) {
    debug(`Datalayer.triggerExtensionHook: triggering extension hook "${name}"`);
    const result = [];
    for (let i = 0; i < this.extensions.length; i += 1) {
      const extension = this.extensions[i];
      if (typeof extension[name] === 'function') {
        result.push(extension[name](...rest));
      }
    }
    debug('Datalayer.triggerExtensionHook result:', result);
    return result;
  }

  /**
   * Returns the global data that came from one of the following sources:
   * a) it was passed to `.initialize` via configuration
   * b) it was collected and aggregated from the entire page by `.initialize`
   * c) it was manually passed as data to the last "pageload" event
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
   * @param  {String}  pluginId     the id of the requested plugin
   */
  getPluginById(pluginId) {
    if (this.initialized) {
      for (let i = 0; i < this.plugins.length; i += 1) {
        if (this.plugins[i].constructor.getID() === pluginId) {
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
    debug(`Datalayer.broadcast: broadcasting event "${name}"`, data);
    this.queue.broadcastEvent(name, data);
  }

  parseDOMNode(node) {
    this.triggerExtensionHook('beforeParseDOMNode', node);
    // this.globalData = this.scanElementForDataMarkup(node);
    // this.scanElementForEventMarkup(node);
  }

  /**
   * Add the given plugin instance to internal list and subscribe it to the event
   * queue, then broadcast event history to it.
   * @param {Object} plugin  reference to the plugin instance
   */
  addPlugin(plugin) {
    // add plugin , then broadcast all events that happened until now
    this.plugins.push(plugin);
    this.queue.subscribe(plugin, true);
  }

  /**
   * Main initialization code. Sets up datalayer, loads plugins, handles execution.
   * @param  {Object}  options  configuration object, see documentation for details
   */
  initialize(options) {
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
    const initializeHookResult = this.triggerExtensionHook('beforeInitialize');
    initializeHookResult.forEach(r => extend(this.globalData, typeof r !== 'undefined' ? r : {}));
    if (!this.globalData) {
      throw new Error('Supplied DALGlobalData is invalid or missing');
    }

    // validate mandatory data (@TODO: we might use a model-based validation here somewhen)
    const gd = this.globalData;
    if (!gd.page || !gd.page.type || !gd.page.name) {
      throw new Error('Supplied DALPageData is invalid or missing');
    }
    if (!gd.site || !gd.site.id) {
      throw new Error('Supplied DALSiteData is invalid or missing');
    }
    if (!gd.user) {
      throw new Error('Supplied DALUserData is invalid or missing');
    }
    debug('Datalayer.initialize: collected data', this.globalData);

    // instantiate plugins based on config and provided ruleset (wrap single function in array first)
    const plugins = options.plugins || [];
    if (plugins) {
      plugins.forEach(plugin => this.addPlugin(plugin));
    }
    debug('Datalayer.initialize: plugins loaded', this.plugins);

    /*
    // instantiate plugins based on config and provided ruleset (wrap single function in array first)
    let rules = options.rules || [];
    if (typeof rules === 'function') {
      rules = [rules];
    }
    if (rules.length) {
      rules.forEach((callback) => {
        const pluginList = callback(this.globalData);
        if (pluginList) {
          pluginList.forEach(p => this.addPlugin(p));
        }
      });
    }
    debug('Datalayer.initialize: plugins (after rules):', this.plugins);
    */

    // core initialization is ready, broadcast 'initialize' event and resolve "whenReady" promise
    this.initialized = true;
    // debug('broadcasting initialize event', this.broadcast('initialize', this.globalData));
    this.readyPromiseResolver();

    if (options.broadcastPageload !== false) {
      debug('Datalayer.initialize: broadcasting initial pageload event');
      this.broadcast('pageload', this.globalData);
    }

    // collect event data from document and send events to plugins
    debug('Datalayer.initialize: scanning DOM');
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
   */
  isTestModeActive() {
    // debug(window.location.search);
    if (cookie.get('__dtlrtest__')) {
      debug('Datalayer.isTestModeActive: cookie found');
      if (window.location.search.match(/__dtlrtest__=0/gi)) {
        debug('Datalayer.isTestModeActive: removing cookie');
        cookie.remove('__dtlrtest__', { path: '/' });
        return false;
      }
      return true;
    } else if (window.location.search.match(/__dtlrtest__=1/gi)) {
      cookie.set('__dtlrtest__', '1', { path: '/', maxAge: 3600 * 24 * 7 });
      return true;
    }
    return false;
  }
}

/**
 * Baseclass for all datalayer.js plugins.
 *
 * TESTING!!!
 */
export class Plugin {
  constructor(id, config = {}) {
    this.id = id;
    this.config = config;
  }

  getId() {
    return this.id;
  }

  /**
   * Initialize any DOM resources for this plugin. Called exactly once, when
   * the plugin is activated for the first time.
   */
  handleInit() {}

  /**
   * Decides whether this plugin will receive data within the current context.
   * The decision about load handling is done by the plugin to keep the config
   * short and clean. However, the datalayer configuration can overrule the
   * plugin's default and prohibit data access whenever necessary.
   * @param {D7rPageData} data  the current data object for the current page context
   */
  handleActivate(data) {}

  /**
   * Main event handling callback.
   * @param {string} name of event to be handled
   * @param {any} data event data, type and structure depend on event type
   */
  handleEvent(name, data) {}
}

// create new datalayer singleton instance
const datalayer = new Datalayer();

// XXX: store datalayer reference in window (currently needed for functionally testing plugins)
window._datalayer = datalayer;

export default datalayer;
