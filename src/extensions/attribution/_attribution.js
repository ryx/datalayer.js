/**
 * Record a visitor's touchpoints and provide access to this channel history.
 *
 * Logic:
 * -> init:
 * -- read channel information from URL, based on provided configuration
 * -- if touchpoint is recognized, store info in touchpoint history (storage)
 *
 * -> getAttributedChannel():
 * -- check touchpoints and calculate "winning" channel
 * -- delete winning channel (or mark channel as "done"? should check in econda)
 * -- return winning channel
 *
 * Usage:
 *
 * // init channels
 * channel = touchpoints.init({
 *  channels: [...]
 * });
 *
 */

/**
 * Internal data record object with visit timestamp and touchpoint objects. Contains an object in the form of
 *
 * `{ e: { c: 'SEA', t: 150003432, n: 'some/campaign/name' }, lt: 1500002211 }`
 *
 * where "e" stands for entries, "c" for channel, "t" for timestamp, "n" for name of campaign and
 * "lt" for last touch (which is the timestamp of the last page refresh)
 */
let _data = null;

/**
 * Internal config object with default setup.
 */
const _defaultConfig = {
  cookieName: '__mcajs',
  channels: [],
  touchpointLifetime: 2592000, /* 60 * 60 * 24 * 30 = 30 days */
  visitDuration: 1800, /* 60 * 30 = 30min */
};
let _config = JSON.parse(JSON.stringify(_defaultConfig));

/**
 * Internal list with available channel handling callbacks as key/value pairs.
 */
const _channelCallbacks = {};

/**
 * Search engine recognition rules. Used by the "searchEngine"-based rules to determine if
 * referring traffic is coming from a searchengine. Intentionally only providing the "critical
 * mass" engines for performance and code-size reasons.
 * @FIXME: we should cache the recognition results and only process this stuff once ;)
 */
const _searchEngineRules = [
  /* eslint-disable max-len */
  { rule: /(\.)?(google|googlesyndication|googleadservices|naver|bing|yahoo|yandex|daum|baidu|myway|ecosia|ask|dogpile|sogou|seznam|aolsvc|altavista|duckduckgo|mywebsearch|wow|webcrawler|infospace|blekko|docomo)(?=\.[a-z.]{2,5})/gi, valueParam: false },
  /* eslint-enable */
  { rule: /(\.)?(goo\.gl)/ig, valueParam: false },
  { rule: /^android-app:\/\/com\.google\.android/ig, valueParam: false },
];

// Return current time as UNIX timestamp /seconds-based)
function getCurrentTime() {
  return parseInt((new window.Date()).getTime() / 1000, 10);
}

/**
 * Get a query parameter's value from window.location.search or a given string context.
 * @FIXME: use better query parser function, that caches the results!
 * @param {String} name name of attribute to read from query string
 * @param {String} [context] lookup context
 * @return {String|null} value of the parameter or null if not found
 */
export const getQueryParam = (name, context = null) => {
  const expr = new RegExp(`(^|&|\\?)${name}=(.*?)($|&)`, 'ig');
  const result = expr.exec(context || window.location.search);
  return result !== null && result.length > 1 ? result[2] : null;
};

/**
 * Return the list of existing touchpoints for the current visitor.
 */
export function getTouchpoints() {
  return _data ? _data.e : [];
}

/**
 * Return the internal data object.
 */
export function getData() {
  return _data;
}

/**
 * Return the internal (i.e. active) configuration object.
 */
export function getConfig() {
  return _config;
}

/**
 * Validate URL and query string against predefined rules. Accepts the following options in `config`:
 * `match`: ...
 * @param {Object} config
 */
export function handleMatchTypeChannel(config) {
  let match = null;
  if (typeof config.match === 'string') {
    // simply check for existence of provided parameter in query string
    match = getQueryParam(config.match) !== null;
  } else if (config.match instanceof RegExp) {
    // execute provided RegExp on query string
    match = config.match.exec(window.location.search);
  } else if (typeof config.match === 'object') {
    // check for provided parameter(s) matching either the exact value in query string
    // or, if provided as boolean value, check for (non-)existence of given query param
    const keys = Object.keys(config.match);
    const matches = [];
    for (let i = 0; i < keys.length; i += 1) {
      const configVal = config.match[keys[i]];
      const queryVal = getQueryParam(keys[i]);
      matches.push(typeof configVal === 'boolean' ? !!queryVal === configVal : queryVal === configVal);
    }
    match = matches.indexOf(false) === -1;
  } // @TODO: else if (typeof def.match === 'function') {
  if (match) {
    // get value depending on type
    let value = null;
    if (typeof config.value === 'string') {
      value = decodeURIComponent(getQueryParam(config.value));
    } // @TODO: else if (typeof def.value === 'function') {
    // return channel object
    return { c: config.name, v: value };
  }
  return null;
}

/**
 * Validate referrer against user-defined RegExp object(s) or callback function. Accepts
 * the following options in `config`:
 * @param {Object} config
 */
export function handleReferrerTypeChannel(config) {
  let ref = config.referrer;
  if (config.referrer instanceof RegExp || typeof config.referrer === 'function') {
    ref = [config.referrer];
  }
  if (ref && ref.length > 0) {
    for (let j = 0; j < ref.length; j += 1) {
      if (
        (ref[j] instanceof RegExp && ref[j].exec(window.document.referrer))
        || (typeof ref[j] === 'function' && ref[j](window.document.referrer))
      ) {
        return { c: config.name };
      }
    }
  }
  return null;
}

/**
 * Validate referrer against pre-defined list of search engines.
 * @param {Object} config
 */
export function handleSearchEngineTypeChannel(config) {
  for (let j = 0; j < _searchEngineRules.length; j += 1) {
    const engine = _searchEngineRules[j];
    if (window.document.referrer.match(engine.rule)) {
      return { c: config.name, v: engine.value ? getQueryParam(engine.valueParam) : '' };
    }
  }
  return null;
}

/**
 * Add a callback that handles a specific type of channnel recognition.
 * @param {String} type name of type to be passed in config
 * @param {Function} callbackFn callback function that handles this channel type
 */
export function addChannelHandlingCallback(type, callbackFn) {
  _channelCallbacks[type] = callbackFn;
}

/**
 * Return the correct processing callback for the given channel type.
 * @param {String} type type of channel to get the callback for
 */
export function getChannelHandlingCallback(type) {
  if (typeof _channelCallbacks[type] !== 'undefined') {
    return _channelCallbacks[type];
  }
  throw new Error(`touchpoints.getChannelHandlingCallback: channel type "${type}" is unknown `);
}

/**
 * Returns the configuration entry for the given channel by its `name` attribute.
 * @param {String} name name of channel to get the config for
 * @returns {Object} channel configuration (or null if not found)
 */
export function getChannelConfigByName(name) {
  for (let i = 0; i < _config.channels.length; i += 1) {
    if (_config.channels[i].name === name) {
      return _config.channels[i];
    }
  }
  return null;
}

/**
 * Apply channel attribution logic on existing touchpoint history and
 * return "winning" channel.
 * @returns {Array<Object>} array with touchpoint objects
 */
export function getAttributedChannel() {
  let winner = null;
  if (_data && _data.e.length > 0) {
    for (let i = 0; i < _data.e.length; i += 1) {
      const touchPoint = _data.e[i];
      const touchPointConfig = getChannelConfigByName(touchPoint.c);
      // const winnerConfig = winner ? getChannelConfigByName(winner.c) : null;
      // @FIXME: handle error on missing config!
      if (
        // if given touchpoint is still "alive" ..
        touchPoint.t > getCurrentTime() - _config.touchpointLifetime
        && (
          winner === null // set if still empty
          || touchPointConfig.canOverwrite // overwrite previous if current may overwrite
        )
      ) {
        winner = touchPoint;
      }
    }
  }
  return winner;
}

/**
 * Read the given key's value from the storage (try cookie first, else use localStorage)
 * and retutn it as parsed object.
 * @param {String}  key   name of key to be read
 * @returns {Object}  the value as object or null
 */
export function storageRead(key) {
  let json = '';
  let obj = null;
  try {
    json = window.localStorage.getItem(key);
  } catch (e) {
    // just silently handle this
    console.error(e);
  }
  if (!json) {
    const match = window.document.cookie.match(new RegExp(`(^| )${key}=([^;]+)`));
    if (match && match.length > 1) {
      /* eslint-disable prefer-destructuring */
      json = match[2];
    }
  }
  try {
    obj = window.JSON.parse(json);
  } catch (e) {
    // console.error('attribution.js[storageRead]: JSON.parse failed', e);
  }
  return obj;
}

/**
 * Store the given value in the storage (try localStorage first, else use cookie if error)
 * @param {String}  key     name of key to be read
 * @param {Object}  value   object to be stored
 */
export function storageWrite(key, value) {
  let json = '';
  if (typeof value !== 'string') {
    json = window.JSON.stringify(value);
  }
  try {
    window.localStorage.setItem(key, json);
  } catch (e) {
    window.document.cookie = `${key}=${json};path=/;`;
  }
}

// add global channel handlers
addChannelHandlingCallback('match', handleMatchTypeChannel);
addChannelHandlingCallback('referrer', handleReferrerTypeChannel);
addChannelHandlingCallback('searchEngine', handleSearchEngineTypeChannel);

/**
 * Initialize lib and return current channel, if any was provided.
 * @param {Object} config channel configuration object
 * @returns {Object} channel object
 */
export function initAttribution(config = {}) {
  const curTime = getCurrentTime();
  let currentChannel = null;
  // @TODO validate config
  // ...

  // extend local config with global config (IE-friendly)
  Object.keys(config).forEach((key) => { _config[key] = config[key]; });

  // fetch data object from storage
  if (!_data) {
    _data = storageRead(_config.cookieName) || { e: [], lt: 0 };
  }

  // Scan the environment (e.g. referrer/URL) for an existing channel based on the provided
  // channel configuration and apply channel logic (i.e. store recognized channel if
  // applicable)
  for (let i = 0; i < _config.channels.length; i += 1) {
    const channelConfig = _config.channels[i];
    const result = getChannelHandlingCallback(channelConfig.type)(channelConfig);
    if (result) {
      currentChannel = result;
      currentChannel.t = curTime;
      const lastChannel = _data.e.length > 0 ? _data.e[_data.e.length - 1] : null;
      // ignore, update, or add?
      if (channelConfig.firstView && curTime - _data.lt < _config.visitDuration) {
        // ignore, if the channel is set to "firstView" but this is not the first view within the visit
        currentChannel = null;
      } else if (lastChannel && lastChannel.c === result.c && lastChannel.v === result.v) {
        // update timestamp, if last entry is equal to current channel
        lastChannel.t = currentChannel.t;
      } else {
        // add to history in all other cases
        _data.e.push(currentChannel);
      }
      break;
    }
  }

  // update "last touch" timestamp in session
  _data.lt = curTime;

  // update data in storage
  storageWrite(_config.cookieName, _data);

  // return recognized channel
  return currentChannel || null;
}

/**
 * Reset all attribution information for the current session. Used in
 * testing to reset state and clear all local data.
 */
export function resetAttribution() {
  _data = null; // { e: [], lt: 0 };
  _config = JSON.parse(JSON.stringify(_defaultConfig));
}

export default {
  initAttribution,
  addChannelHandlingCallback,
  getChannelHandlingCallback,
  getQueryParam,
  getTouchpoints,
  getData,
  getConfig,
  getAttributedChannel,
  storageRead,
  storageWrite,
  handleSearchEngineTypeChannel,
};
