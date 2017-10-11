import window from './lib/globals/window';
import Logger from './lib/logger';
import cookie from './lib/cookie';
import utils from './lib/utils';

const PLUGIN_QUEUED = 1;
const PLUGIN_LOADING = 2;
const PLUGIN_READY = 3;

/**
 * The global Datalayer class, gets instantiated as singleton.
 * The datalayer is responsible for aggregating and providing and loading
 * plugins. The data is then passed to available plugins which can feed
 * it to external and/or third-party plugins.
 *
 * instance like:
 *
 * new Datalayer();
 */
class Datalayer {

  constructor() {
    // module globals
    this.metaPrefix = 'odl:';           // prefix for metatags attributes
    this.broadcastQueue = [];           // queue with things that happen before initialize is called
    this.pluginQueue = [];              // queue with plugins that are requested before initialize is called
    this.plugins = {};                  // map with loaded plugin plugins
    this.modules = {};                  // map with module handles
    this.globalData = {};               // data storage
    this.globalConfig = {};             // configuration object (passed via odl:config)
    this.initialized = false;           // initialized flag (true, if core initialization is done)
    this.ready = false;                 // ready flag (true, if all plugins are loaded)
    this.testModeActive = this.isTestModeActive();
    logger.log('testmode', this.testModeActive);
    // promises
    this.initializePromise = new Promise();
  }

  /**
   * Handle and (un-/)persist test mode for plugin delivery.
   */
  isTestModeActive() {
    if (cookie.get('__odltest__')) {
      if (window.location.search.match(/__odltest__=0/gi)) {
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

  /**
   * Send event to the given plugin.
   * @param {Object}  plugin the plugin reference (in this.plugins) to broadcast the event to
   * @param {String}  eventName  the event name/type to be fired (e.g. 'load', addtocart', 'click', 'view') OR an object with all three parameters
   * @param {Object}  eventData  the event data to pass along with the event, may be any type of data (not necessarily an object literal)
   */
  sendEventToPlugin(plugin, eventName, eventData) {
    if (plugin && typeof plugin.handleEvent === 'function') {
      logger.log(`broadcasting '${eventName}' to plugin '${plugin.id}' with data:`, eventData);
      plugin.handleEvent(eventName, eventData, (new Date()).getTime());
    }
  }

  /**
   * Collect identity data (session, browser) from platform cookies and return
   * true or false depending on success reading cookies.
   */
  collectIdentityDataFromCookies() {
    if (!cookie.get('bid')) {
      logger.warn('unable to read identity cookies');
    }
    this.globalData.identity = {
      bid: cookie.get('bid'),
    };
    return true;
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
   * Returns the global data that was collected and aggregated from the entire page.
   */
  getData() {
    return this.globalData;
  }

  /**
   * Wrapper for the previous AMD-based loader. Simply imitates an asynchronous process
   * here. @TODO: plugin "loading" needs a general rewrite.
   * @param  {String}  id     the id of the requested plugin
   * @param  {Function}  callback   a function to execute when the plugin is loaded (gets plugin object as only parameter)
   */
  loadPlugin(id, callback) {
    callback(this.mappings[id]);
  }

  /**
   * Returns a Promise that gets resolved with the reference to a specific plugin.
   * @param  {String}  pluginId     the id of the requested plugin
   */
  getPlugin(pluginId) {
    if (this.initialized) {
      return new Promise((resolve, reject) => {
        let plugin = this.plugins[pluginId];
        if (typeof plugin === 'undefined') {
          plugin = {
            status: PLUGIN_QUEUED,
            plugin: null,
          };
        }
        if (plugin.status === PLUGIN_READY) {
          logger.log(`plugin '${pluginId}' already available`);
          resolve(this.plugins[pluginId].service);
        } else if (plugin.status === PLUGIN_QUEUED) {
          logger.log(`requiring plugin '${pluginId}'`);
          plugin.status = PLUGIN_LOADING;
          window.require([pluginId], (Service) => {
            logger.log(`plugin '${pluginId}' newly loaded`);
            // construct service, pass data/config, store reference
            this.plugins[pluginId].service = new Service(this, this.globalData, this.globalConfig[pluginId] || {});
            // broadcast any events that happened until now
            const keys = Object.keys(this.broadcastQueue);
            for (let i = 0; i < keys.length; i += 1) {
              const event = this.broadcastQueue[keys[i]];
              logger.log(`re-broadcasting event '${event[0]}' to plugin '${pluginId}'`);
              this.sendEventToPlugin(this.plugins[pluginId], event[0], event[1]);
            }
            resolve(this.plugins[pluginId].service);
          }, () => {
            reject(new Error(logger.log(`plugin '${pluginId}' failed to load`)));
          });
        } else {
          // SERVICE_LOADING, nothing further to do for now
        }
      });
    }
    throw new Error('getPlugin called prior to initialization (always wrap in whenInitialized())');
  }

  /**
   * Checks whether the plugin with the given id is either loaded or queued.
   * @param  {String} id  plugin name (e.g. 'gk/lib/dal/adobe') to check for
   */
  hasPlugin(id) {
    if (typeof this.plugins[id] !== 'undefined') {
      return this.plugins[id].status;
    }
    return false;
  }


  /**
   * Checks whether the plugin with the given id is either loaded or queued.
   * @param  {String} id  plugin name (e.g. 'gk/lib/odl/econda') to check for
   */
  hasPlugin(id) {
    if (typeof this.plugins[id] !== 'undefined') {
      return true;
    }
    /* @TODO: for (const s of pluginQueue) { */
    const keys = Object.keys(this.pluginQueue);
    for (let i = 0; i < keys.length; i += 1) {
      const s = this.pluginQueue[keys[i]];
      if (s.id === id) {
        return true;
      }
    }
    return false;
  }

  /**
   * Load a given list with plugins. Includes the plugins using require calls and
   * initializes them, passing in the global ODL data to the constructor.
   * @param  {Array<String>} ids  list with plugin/plugin names (e.g. 'gk/lib/odl/econda')
   * @param  {Function}  callback  a callback to be fired when ALL requested plugins have loaded
   */
  loadPlugins(ids, callback) {
    let pending = ids.length;
    // count down and notify callback if all plugins are loaded
    const onPluginLoaded = () => {
      pending -= 1;
      if (pending === 0 && typeof callback === 'function') {
        callback();
      }
    };
    /* @TODO: for (const id of ids) { */
    const keys = Object.keys(ids);
    for (let i = 0; i < keys.length; i += 1) {
      const id = ids[keys[i]];
      logger.log(`loading '${id}'`);
      this.getPlugin(id, onPluginLoaded);
    }
  }

  /**
   * Broadcast a public event to all loaded plugins. You can either pass name,
   * data and domain as individual arguments or you can pass a single object (e.g.
   * {name: 'event', data: {foo: 'bar'}, domain: 'fint'}) as the only argument. Both will
   * have the same result.
   * @param  {String|Object}  name  the event name/type to be fired (e.g. 'load',
   *          addtocart', 'click', 'view') OR an object with all three parameters
   * @param  {Object}  data  the event data to pass along with the event, may be any type
   *          of data (not necessarily an object literal)
   */
  broadcast(name, data) {
    const keys = Object.keys(this.plugins);
    for (let i = 0; i < keys.length; i += 1) {
      this.sendEventToPlugin(this.plugins[keys[i]], name, data);
    }
    logger.log('queuing broadcast', name, data);
    this.broadcastQueue.push([name, data]);
  }

  /**
   * Scan a given HTMLElement for odl:data-Metatags and update global data accordingly.
   *
   * @param {String|HTMLElement}  node  DOM node or CSS selector to scan for data
   */
  scanForDataMarkup(node = window.document) {
    return utils.collectMetadata(`${this.metaPrefix}data`, () => {}, node, this.globalData);
  }

  /**
   * Scan a given HTMLElement for odl:event-Metatags and broadcast any events that
   * were found.
   *
   * @param {String|HTMLElement}  node  DOM node or CSS selector to scan for events
   */
  scanForEventMarkup(node) {
    return utils.collectMetadata(`${this.metaPrefix}event`, (err, element, obj) => {
      if (err) {
        logger.error(err);
        return;
      }
      if (!element.hasAttribute('data-odl-handled-event')) {
        element.setAttribute('data-odl-handled-event', 1);
        this.broadcast(obj.name, obj.data);
      }
    }, node);
  }

  /**
   * Main initialization code. Loads global and local plugins.
   *
   * The function takes a second parameter that allows paasing in a custom
   * configuration, as demonstrated in the following example:
   *
   * 1) supply custom plugin list (used for unit testing)
   * ODL.initialize({}, {gk/lib/odl/econda':true})
   *
   * 2) supply configuration for specific plugins
   * ODL.initialize({}, {}, {'gk/lib/odl/richrelevance': {'baseUrl':'/some/foo/bar'}})
   * @param  {Object}  data  the global data as aggregated from all odl:data tags
   * @param  {Object}  ruleset   ruleset declaration supplying decision logic when to load which plugins
   * @param  {Object}  config  (optional) configuration object containing per-plugin config
   *          that gets passed to the initialize call of the corresponding plugin. See header docs for more info.
   * @param  {Array<String>} localPlugins (optional) list with plugins to be loaded (including path)
   * @param  {Object} mappings (optional) object literal with name->instance mappings for plugin modules
   */
  initialize(data, ruleset, config, localPlugins = [], mappings = {}) {
    let pluginsToLoad = [];
    if (this.initialized) {
      logger.warn('already initialized');
      return false;
    }
    this.mappings = mappings;
    // this.globalData = data || null;
    this.globalConfig = config || {};
    // collect global data from document
    this.globalData = data;
    this.scanForDataMarkup(window.document);
    // validate mandatory data
    if (data === null || typeof data === 'undefined') {
      throw new Error('No ODLGlobalData supplied');
    }
    if (!data.page || !data.page.type || !data.page.name) {
      throw new Error('Supplied ODLPageData is invalid or missing');
    }
    if (!data.site || !data.site.id) {
      throw new Error('Supplied ODLSiteData is invalid or missing');
    }
    if (!data.user) {
      throw new Error('Supplied ODLUserData is invalid or missing');
    }
    // read identity data
    this.collectIdentityDataFromCookies();
    logger.log('collected data', this.globalData);
    // core initialization is ready
    this.initialized = true;
    // broadcast 'initialize' event
    logger.log('broadcasting initialize event', this.broadcast('initialize', this.globalData));
    // check which plugins to load based on supplied ruleset
    if (ruleset) {
      // @TODO: for (const [name, rule] of ruleset) {
      const keys = Object.keys(ruleset);
      for (let i = 0; i < keys.length; i += 1) {
        if (this.validateRule(ruleset[keys[i]])) {
          pluginsToLoad.push(keys[i]);
        }
      }
    }
    // override plugins with config.plugins, if defined
    logger.log('init global plugins', pluginsToLoad);
    if (config && typeof config.plugins !== 'undefined') {
      logger.log('overriding global plugins with config.plugins', config.plugins);
      pluginsToLoad = config.plugins;
    }
    // load plugins
    this.loadPlugins(pluginsToLoad, () => {
      // answer all pending getPlugin calls
      /* @TODO for (const plugin of pluginQueue) { */
      const keys = Object.keys(this.pluginQueue);
      for (let i = 0; i < keys.length; i += 1) {
        const plugin = this.pluginQueue[keys[i]];
        this.getPlugin(plugin.id, plugin.callback);
      }
      // set global ODL-is-ready flag (used in tests)
      this.ready = true;
    });
    if (this.pluginQueue.length === 0) {
      this.ready = true;
    }
    // load locally defined plugins
    logger.log('init local plugins', localPlugins);
    this.loadPlugins(localPlugins || []);
    // collect event data from document and send events to plugins
    logger.log(`scanning for ${this.metaPrefix}event markup`);
    this.scanForEventMarkup();
    // install method queue
    utils.createMethodQueueHandler(window, '_odlq', this);
    return true;
  }

  inTestMode() {
    return this.testModeActive === true;
  }

  isReady() {
    return this.ready === true;
  }

  isInitialized() {
    return this.initialized === true;
  }

}

// create new ODL singleton instance
const odl = new ODL();

// XXX: store ODL reference in window (currently needed for functionally testing ODL plugins)
window._odl = odl;


export default odl;
