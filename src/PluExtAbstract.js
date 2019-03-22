/* eslint-disable class-methods-use-this, no-unused-vars */
/**
 * Internal abstract baseclass for plugin and extension.
 */
export default class PluExtAbstract {
  /**
   * Child classes have to explicitly set the id:
   * @param {String} id unique identifier
   */
  constructor(id) {
    this.id = id;
  }

  /**
   * Return the plugin's / extension's unique ID as defined within class constructor. It is worth to mention that
   * this ID is the same for all instances of this plugin. Instance-specific IDs have to be handled
   * by the plugin implementation itself.
   * @returns {String}  unique ID for this plugin
   */
  getID() {
    return this.id;
  }
}
