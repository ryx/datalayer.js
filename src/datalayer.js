/**
 *        __      __        __                          _
 *   ____/ /___ _/ /_____ _/ /___ ___  _____  _____    (_)____
 *  / __  / __ `/ __/ __ `/ / __ `/ / / / _ \/ ___/   / / ___/
 * / /_/ / /_/ / /_/ /_/ / / /_/ / /_/ /  __/ /  _   / (__  )
 * \__,_/\__,_/\__/\__,_/_/\__,_/\__, /\___/_/  (_)_/ /____/
 *                              /____/           /___/
 *
 * Copyright (c) 2016-present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import window from './lib/window';
import utils from './lib/utils';
import cookie from './lib/cookie';
import EventQueue from './lib/queue';

// debugging helper
/* eslint-disable func-names, no-console, prefer-spread, prefer-rest-params */
const DEBUG = typeof process.env.DEBUG !== 'undefined';
function debug() {
  if (DEBUG) {
    console.log.apply(console, ['[debug]:'].concat(Array.prototype.slice.call(arguments)));
  }
}
/* eslint-enable func-names */

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
   * Validate the given load rule and return either true or false.
   * @param  {Object|boolean}  rule  rule object to validate or a boolean value
   */
  validateRule(rule) {
    if (typeof rule === 'boolean') {
      return rule;
    } else if (typeof rule === 'function') {
      const r = rule(this.globalData);
      return r; // rule(globalData);
    } else if (!rule.test || (rule.test === true && this.testModeActive)) {
      return rule.rule(this.globalData);
    }
    return false;
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
    debug('broadcasting event', name, data);
    this.queue.broadcastEvent(name, data);
  }

  /**
   * Scan a given HTMLElement for dal:data-Metatags and update global data accordingly.
   * @param {String|HTMLElement}  node  DOM node or CSS selector to scan for data
   */
  scanForDataMarkup(node = window.document) {
    return utils.collectMetadata(`${this.metaPrefix}data`, () => {}, node, this.globalData);
  }

  /**
   * Scan a given HTMLElement for odl:event-Metatags and broadcast any events that
   * were found.
   * @param {String|HTMLElement}  node  DOM node or CSS selector to scan for events
   */
  scanForEventMarkup(node) {
    return utils.collectMetadata(`${this.metaPrefix}event`, (err, element, obj) => {
      if (err) {
        console.error(err);
        return;
      }
      if (!element.hasAttribute('data-odl-handled-event')) {
        element.setAttribute('data-odl-handled-event', 1);
        this.broadcast(obj.name, obj.data);
      }
    }, node);
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
    let plugins = options.plugins || [];

    // set config (@TODO: also collect config from markup here!)
    this.globalConfig = options.config || {};

    // collect global data from document
    this.globalData = data;
    this.scanForDataMarkup(window.document);

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
    debug('collected data', this.globalData);

    // instantiate plugins based on config and provided ruleset (wrap single function in array first)
    if (typeof plugins === 'function') {
      plugins = [plugins];
    }
    if (plugins.length) {
      plugins.forEach((callback) => {
        const pluginList = callback(this.globalData);
        if (pluginList) {
          pluginList.forEach(p => this.addPlugin(p));
        }
      });
    }
    debug('plugins:', this.plugins);

    // install method queue
    utils.createMethodQueueHandler(window, '_dtlrq', this);

    // core initialization is ready, broadcast 'initialize' event and resolve "whenReady" promise
    this.initialized = true;
    // debug('broadcasting initialize event', this.broadcast('initialize', this.globalData));
    this.readyPromiseResolver();

    if (options.broadcastPageload !== false) {
      debug('broadcasting initial pageload event');
      this.broadcast('pageload', this.globalData);
    }

    // collect event data from document and send events to plugins
    debug(`scanning for ${this.metaPrefix}event markup`);
    this.scanForEventMarkup();

    return true;
  }

  inTestMode() {
    return this.testModeActive === true;
  }

  isReady() {
    return this.initialized === true;
  }

  /* eslint-disable class-methods-use-this */
  /**
   * Handle and (un-/)persist test mode for plugin delivery.
   */
  isTestModeActive() {
    // debug(window.location.search);
    if (cookie.get('__odltest__')) {
      debug('Cookie found');
      if (window.location.search.match(/__odltest__=0/gi)) {
        debug('Removing cokie');
        cookie.remove('__odltest__', { path: '/' });
        return false;
      }
      return true;
    } else if (window.location.search.match(/__odltest__=1/gi)) {
      cookie.set('__odltest__', '1', { path: '/', maxAge: 3600 * 24 * 7 });
      return true;
    }
    return false;
  }
}

// create new ODL singleton instance
const datalayer = new Datalayer();

// XXX: store ODL reference in window (currently needed for functionally testing ODL plugins)
window._datalayer = datalayer;


export default datalayer;
