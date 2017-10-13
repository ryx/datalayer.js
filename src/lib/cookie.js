/**
 * Very thin cookie-wrapper to ease testing, based on implementation by
 * Christophe Porteneuve (http://github.com/tdd/cookies-js-helper)
 */
import window from './window';

/**
 * Set a cookie with the given name and options.
 */
function set(name, value, options = {}) {
  const def = [`${name}=${value}`];
  if (options.path) {
    def.push(`path=${options.path}`);
  }
  if (options.maxAge) {
    def.push(`max-age=${options.maxAge}`);
  }
  if (options.domain) {
    def.push(`domain=${options.domain}`);
  }
  const expires = options.expires && typeof options.expires.getTime !== 'undefined' ? options.expires.toUTCString() : options.expires;
  if (expires) {
    def.push(`expires=${expires}`);
  }
  window.document.cookie = def.join(';');
  return def;
}

/**
 * Get the value of the cookie with the given name or empty string if
 * cookie is unset.
 */
function get(name) {
  const pairs = window.document.cookie.split(';');
  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i].split('=', 2);
    if (pair[0] === name) {
      return pair[1];
    }
  }
  return '';
}

/**
 * Remove a cookie with given name and specific options (e.g. domain / path)
 */
function remove(name, options) {
  const opt2 = {};
  for (const key in (options || {})) opt2[key] = options[key];
  opt2.expires = (new Date(0)).toUTCString();
  opt2.maxAge = -1;
  return set(name, null, opt2);
}

export default {
  set,
  get,
  remove,
};
