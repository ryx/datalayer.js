/**
 * Extend (i.e. deep-merge) a given target object using a given source object.
 * @param {Object}  target  object to merge into
 * @param {Object}  source  object to be merged
 * @returns {Object} the resulting, deeply merged object
 */
export function extend(target, source) {
  const keys = Object.keys(source);
  for (let i = 0; i < keys.length; i += 1) {
    const val = source[keys[i]];
    let src;
    if (
      val !== null
      && ['string', 'number', 'boolean'].indexOf(typeof val) === -1
      && typeof val.length === 'undefined'
    ) {
      src = extend(target[keys[i]] || {}, val);
    } else {
      src = val;
    }
    target[keys[i]] = src;
  }
  return target;
}

/**
 * Scan a given node (or the entire DOM) for metatags containing stringified JSON
 * and return the parsed and aggregated object. Returns false and logs an error message, if
 * any error occured (@TODO: use Promise return instead).
 *
 * @param {Object}  name  name value of the metatag to be collected
 * @param {Function}  callback  function to be called for each metadata item
 * (gets passed (optional) error message, element and parsed data object as arguments)
 * @param {String|HTMLElement}  context  (optional) any CSS selector or HTMLElement,
 * if defined it limits the lookup context to the given element
 * @param {Object}  data  initial data, gets extended with the collected data
 */
export function collectMetadata(name, callback, context = null, data = {}) {
  // get parent element to be queried (or use entire document as default)
  let parent = window.document;
  if (context) {
    parent = typeof context === 'string' ? window.document.querySelector(context) : context;
    if (!parent) {
      console.log(`collectMetadata: context with selector "${context}" not found`);
      return false;
    }
  }
  // collect metatags and build up data
  const metatags = parent.querySelectorAll(`meta[name="${name}"]`);
  if (metatags) {
    for (let i = 0; i < metatags.length; i += 1) {
      const el = metatags[i];
      let o = null;
      try {
        o = JSON.parse(el.getAttribute('content'));
      } catch (e) {
        callback(`collectMetadata: parse error ${e.message}: ${e}`);
        break;
      }
      extend(data, o);
      callback(null, el, o);
    }
  }
  return data;
}

/**
 * Create a method queue handler within the provided target object. It can be used to
 * communicate with the provided API without the need to directly access the module.
 *
 * @param context     {Object}  object scope in which to create method queue (e.g. window)
 * @param queueName   {String}  identifier to use as method queue name (e.g. "_odlq")
 * @param apiObj      {Object}  object scope to use for calling the provided methods on
 */
export function createMethodQueueHandler(context, queueName, api = {}) {
  // console.log('createMethodQueueHandler', context, queueName, api);
  function _mqExec(_api, _arr) {
    if (typeof _api[_arr[0]] === 'function') {
      /* eslint-disable prefer-spread */
      _api[_arr[0]].apply(_api, _arr.splice(1));
      /* eslint-enable prefer-spread */
    } else {
      throw new Error(`method "${_arr[0]}" not found in ${_api}`);
    }
  }
  // get the existing method queue array or create a new one
  let mq = [];
  if (typeof context[queueName] === 'undefined') {
    context[queueName] = mq;
  } else {
    mq = context[queueName];
  }
  // execute pending calls
  while (mq.length > 0) {
    _mqExec(api, mq.shift());
  }
  // override push method
  mq.push = (arr) => {
    _mqExec(api, arr);
  };
}

// public API
export default {
  extend,
  collectMetadata,
  createMethodQueueHandler,
};
