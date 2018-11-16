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

// Return current time as UNIX timestamp /seconds-based)
export function getCurrentTime() {
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

/**
 * A Touchpoint represents a single interaction with a given channel at an exact
 * point in time. It contains a value (as returned / recognized) by the associated
 * Channel handler, which usually represents a campaign name.
 */
export class Touchpoint {
  /**
   * Create a new Touchpoint instance.
   * @param {Channel} channel associated Channel instance
   * @param {string} value this Touchpoint's value (e.g. campaign name)
   * @param {number} timestamp creation/modification timestamp
   */
  constructor(channel, value, timestamp = getCurrentTime()) {
    this.channel = channel;
    this.value = value;
    this.timestamp = timestamp;
  }

  /**
   * Return associated Channel instance.
   * @returns {Channel}
   */
  getChannel() {
    return this.channel;
  }

  /**
   * Return value (e.g. campaign name)
   * @returns {string}
   */
  getValue() {
    return this.value;
  }

  /**
   * Return timestamp of last modification/update.
   * @returns {number}
   */
  getTimestamp() {
    return this.timestamp;
  }

  /**
   * Set modification timestamp to the current timestamp.
   */
  updateTimestamp() {
    this.timestamp = getCurrentTime();
  }

  /**
   * Create a JSON representation of this Touchpoint. This is compatible with
   * the legacy API in the original attribution.js.
   * @returns {string}
   */
  toJSON() {
    return JSON.stringify({
      c: this.channel.getId(),
      v: this.value,
      t: this.timestamp,
    });
  }

  /**
   * Create a Touchppoint object from a given JSON string. Expects a JSON object
   * with parameters 'c' containing the channel id and 't' containing the last
   * touch timestamp.
   *
   * This method also needs a reference to a properly configured AttributionEngine
   * to resolve the correct Channel instance based on the channel id provided
   * in the JSON data.
   *
   * @param {AttributionEngine} engine the attribution engine holding the configuration
   * @param {String} json the JSON string to be unserialized
   */
  static fromJSON(engine, json) {
    let data = null;
    try {
      data = JSON.parse(json);
    } catch (e) {
      // swallow any errors, we validate the data in the next line
    }
    if (!data || typeof data.c === 'undefined' || typeof data.t === 'undefined') {
      throw new Error('Touchpoint.fromJSON: expected a string in form of {"c":"id","v":"value","t":1234567890}', data);
    }
    const channel = engine.getChannelById(data.c);
    if (!channel) {
      throw new Error(`Touchpoint.fromJSON: channel "${data.c}" not found in provided engine`);
    }
    // lookup channel and return correct Touchpoint instance
    return new Touchpoint(channel, data.v, data.t);
  }
}

/**
 * Abstract base class for all channels.
 */
export class Channel {
  constructor(id, label, options = {}) {
    this.id = id;
    this.label = label;
    this.options = options;

    // apply defaults
    if (typeof this.options.canOverwrite === 'undefined') {
      this.options.canOverwrite = false;
    }
    if (typeof this.options.isFirstViewOnly === 'undefined') {
      this.options.isFirstViewOnly = false;
    }
  }

  /**
   * Return this channel's unique ID.
   */
  getId() {
    return this.id;
  }

  /**
   * Return this channel's label.
   */
  getLabel() {
    return this.label;
  }

  // execute() {}
}

/**
 * The URLMatchingChannel allows channel recognition based on certain URL patterns.
 * It offers various levels of patter handling, reaching from simple string comparison
 * to more complex regex-based matches.
 *
 * @TODO: add docs and examples
 */
export class URLMatchingChannel extends Channel {
  constructor(id, label, matchPattern, valueParamName, options) {
    super(id, label, options);
    this.matchPattern = matchPattern;
    this.valueParamName = valueParamName;
  }

  /**
   * Execute channel logic and return the recognized Touchpoint or null.
   * @returns {Touchpoint | null}
   */
  execute() {
    let match = null;
    if (typeof this.matchPattern === 'string') {
      // simply check for existence of provided parameter in query string
      match = getQueryParam(this.matchPattern) !== null;
    } else if (this.matchPattern instanceof RegExp) {
      // execute provided RegExp on query string
      match = window.location.search.match(this.matchPattern);
    } else if (typeof this.matchPattern === 'object') {
      // check for provided parameter(s) matching either the exact value in query string
      // or, if provided as boolean value, check for (non-)existence of given query param
      const keys = Object.keys(this.matchPattern);
      const matches = [];
      for (let i = 0; i < keys.length; i += 1) {
        const configVal = this.matchPattern[keys[i]];
        const queryVal = getQueryParam(keys[i]);
        matches.push(typeof configVal === 'boolean' ? !!queryVal === configVal : queryVal === configVal);
      }
      match = matches.indexOf(false) === -1;
    } // @TODO: else if (typeof def.match === 'function') {

    if (match) {
      // get value depending on type
      let value = null;
      if (typeof this.valueParamName === 'string') {
        value = decodeURIComponent(getQueryParam(this.valueParamName));
      } // @TODO: else if (typeof def.value === 'function') {
      // create and return Touchpoint instance
      // return { c: config.name, v: value };
      return new Touchpoint(this, value);
    }

    return null;
  }
}

/**
 * @TODO: add docs and examples
 */
export class ReferrerMatchingChannel extends Channel {
  constructor(id, label, matchPattern, options) {
    super(id, label, options);
    this.matchPattern = matchPattern;
  }

  /**
   * Execute channel logic and return the recognized Touchpoint or null.
   * @returns {Touchpoint | null}
   */
  execute() {
    let ref = this.matchPattern;
    if (this.matchPattern instanceof RegExp || typeof this.matchPattern === 'function') {
      ref = [this.matchPattern];
    }
    if (ref && ref.length > 0) {
      for (let j = 0; j < ref.length; j += 1) {
        if (
          (ref[j] instanceof RegExp && window.document.referrer.match(ref[j]))
          || (typeof ref[j] === 'function' && ref[j](window.document.referrer))
        ) {
          return new Touchpoint(this);
        }
      }
    }

    return null;
  }
}

/**
 * A Channel that tries to recognize SEO traffic by comparing the referrer against a static list
 * of known search engines (stored in SearchEngineChannel.searchEngineRules).
 */
export class SearchEngineChannel extends Channel {
  execute() {
    for (let j = 0; j < SearchEngineChannel.searchEngineRules.length; j += 1) {
      const engine = SearchEngineChannel.searchEngineRules[j];
      if (window.document.referrer.match(engine.rule)) {
        return new Touchpoint(this, engine.valueParam ? getQueryParam(engine.valueParam) : '');
      }
    }

    return null;
  }
}

/**
 * List with search engine URL patterns. Used for referrer-based SEO-engine matching.
 * The "rule" property contains a RegExp pattern to match against, the "valueParam"
 * allows to define a query parameter that is used to lookup the keyword/query that
 * was entered by the user (although most modern search engines do not forward this
 * to the referred website anymore).
 */
SearchEngineChannel.searchEngineRules = [
  /* eslint-disable max-len */
  { rule: /(\.)?(google|googlesyndication|googleadservices|naver|bing|yahoo|yandex|daum|baidu|myway|ecosia|ask|dogpile|sogou|seznam|aolsvc|altavista|duckduckgo|mywebsearch|wow|webcrawler|infospace|blekko|docomo)(?=\.[a-z.]{2,5})/gi, valueParam: false },
  /* eslint-enable */
  { rule: /(\.)?(goo\.gl)/ig, valueParam: false },
  { rule: /^android-app:\/\/com\.google\.android/ig, valueParam: false },
];

/**
 * Abstract base class for all attribution models.
 */
export class AttributionModel {
  constructor(touchpointLifetime) {
    this.touchpointLifetime = touchpointLifetime;
  }

  /* eslint-disable class-methods-use-this */
  execute() {
    return [];
  }
  /* eslint-enable class-methods-use-this */
}

/**
 * Simple attribution model where the last (overwriting) Touchpoint in the journey
 * gets 100% of the attribution. Also called 'Last Click' oder 'Last Cookie Wins'.
 */
export class LastTouchAttributionModel extends AttributionModel {
  constructor() {
    super(2592000 /* 60 * 60 * 24 * 30 = 30 days */);
  }

  /**
   * Apply channel attribution logic on provided touchpoint history and
   * return "winning" channel.
   * @param {Touchpoint[]} touchpoints  array with touchpoints to apply model to
   * @returns {Touchpoint[]} array with "winning" touchpoint objects
   */
  execute(touchpoints = []) {
    let winner = null;
    touchpoints.forEach((touchpoint) => {
      if (
        // if given touchpoint is still "alive" ..
        touchpoint.getTimestamp() > getCurrentTime() - this.touchpointLifetime
        && (
          winner === null // set if still empty
          || touchpoint.getChannel().options.canOverwrite // overwrite previous if current may overwrite
        )
      ) {
        winner = touchpoint;
      }
    });

    return [winner];
  }
}

/**
 * The AttributionEngine takes a given channel configuration and tries to recognize
 * and record touchpoints along to user's journey.
 */
export class AttributionEngine {
  /**
   * Create a new AttributionEngine instance.
   * @param {AttributionModel} model the attribution model to be used
   * @param {Channel[]} channelConfig array with channels to be recognized
   * @param {number} visitDuration the inactivity period after that a user visit will end (defaults to 30min)
   * @param {string} cookieName the name of the internal storage cookie (defaults to "gktp")
   */
  constructor(
    model,
    channelConfig = [],
    visitDuration = 1800, /* 60 * 30 = 30min */
    cookieName = 'gktp'
  ) {
    // configuration
    this.model = model;
    this.channelConfig = channelConfig;
    this.cookieName = cookieName;
    this.visitDuration = visitDuration;

    // internals
    this.touchpointHistory = [];
    this.lastTouchTimestamp = 0; // "0" indicates a fresh visit

    // fetch channel history and "last touch" timestamp from storage
    const data = storageRead(this.cookieName);
    try {
      const json = JSON.parse(data);
      if (json) {
        this.restoreFromData(json);
      }
    } catch (e) {
      // ...
    }
  }

  /**
   * Read storage values, execute attribution logic, update storage and return current touchpoint.
   * @FIXME: shouldn't we read history in constructor instead?? ...
   * @returns {Touchpoint} returns exactly one Touchpoint object that is valid for the current execution context
   */
  execute() {
    const curTime = getCurrentTime();
    let recognizedTouchpoint = null;

    // Scan the environment (e.g. referrer/URL) for an existing channel based on the provided
    // channel configuration and apply channel logic (i.e. store recognized channel if
    // applicable)
    for (let i = 0; i < this.channelConfig.length; i += 1) {
      const channel = this.channelConfig[i];
      recognizedTouchpoint = channel.execute();
      if (recognizedTouchpoint) {
        const hasTouchpoints = this.touchpointHistory.length > 0;
        const lastTouchpoint = hasTouchpoints ? this.touchpointHistory[this.touchpointHistory.length - 1] : null;
        // ignore, update, or add?
        if (channel.options.isFirstViewOnly && curTime - this.lastTouchTimestamp < this.visitDuration) {
          // ignore, if the channel is set to "firstView" but this is not the first view within the visit
          recognizedTouchpoint = null;
        // } else if (lastChannel && lastChannel.c === result.c && lastChannel.v === result.v) {
        } else if (
          lastTouchpoint
          && lastTouchpoint.getValue() === recognizedTouchpoint.getValue()
          && lastTouchpoint.getChannel().getId() === recognizedTouchpoint.getChannel().getId()
        ) {
          // update timestamp, if last entry is equal to current channel
          lastTouchpoint.updateTimestamp();
        } else {
          // add newly found touchpoint to history in all other cases
          this.touchpointHistory.push(recognizedTouchpoint);
        }
        break;
      }
    }

    // update "last touch" timestamp in session
    this.lastTouchTimestamp = curTime;

    // update data in storage
    storageWrite(this.cookieName, JSON.stringify(this.saveToData()));

    return recognizedTouchpoint;
  }

  /**
   * Execute the current attribution model on the entire touchpoint history and return
   * the resulting list of attributed touchpoints.
   * @returns {Touchpoint[]} Array with Touchpoint objects
   */
  getAttributedTouchpoints() {
    return this.model.execute(this.getTouchpointHistory());
  }

  /**
   * Returns the currently recorded history of touchpoints for the current browser (i.e. storage).
   * This list gets extended or updated whenever AttributionEngine.execute is called.
   * @returns {Touchpoint[]} array with Touchpoint objects
   */
  getTouchpointHistory() {
    return this.touchpointHistory;
  }

  /**
   * Returns a Channel by its id attribute or null if no channel with id was found.
   * @param {String}  id  the id of the channel to be found
   * @returns {Channel} the channel for the given id
   */
  getChannelById(id) {
    for (let i = 0; i < this.channelConfig.length; i += 1) {
      if (this.channelConfig[i].getId() === id) {
        return this.channelConfig[i];
      }
    }

    return null;
  }

  /**
   * Restore touchpoint history from a given JSON object load it into the engine.
   * @param {Object} json plain object within the form of { e:Touchpoint[], lt:number }
   */
  restoreFromData(data) {
    if (data /* @TODO and data is valid */) {
      this.lastTouchTimestamp = data.lt;
      this.touchpointHistory = [];
      data.e.forEach((touchpointData) => {
        const touchpoint = Touchpoint.fromJSON(this, touchpointData);
        if (touchpoint) {
          this.touchpointHistory.push(touchpoint);
        }
        // @TODO log error?
      });
    }
  }

  /**
   * Serialize current touchpoint history and last touch timestamp and return
   * them as plain JSON object.
   * @returns {Object}
   */
  saveToData() {
    return {
      e: this.touchpointHistory.map(touchpoint => touchpoint.toJSON()),
      lt: this.lastTouchTimestamp,
    };
  }
}
