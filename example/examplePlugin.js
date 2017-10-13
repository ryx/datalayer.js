/**
 * Simple example plugin to demonstrate DAL functionality. Extensive comments
 * are intentional ;)
 */
export default class ExamplePlugin {
  constructor(datalayer, data, config) {
    // we store the config to use it later in handleEvent
    this.config = config;
  }

  /**
   * Return the plugin's unique ID. Plugins have to provide an id by convention,
   * this is required for configuration overrides and also helpful for debugging.
   * @return {String} id of the plugin
   */
  static getID() {
    return 'my/test/examplePlugin';
  }

  handleEvent(name, data) {
    switch (name) {
      case 'pageload':
        console.log('Page loaded');
        break;
      case 'say-hello':
        console.log(`Hello from ${this.constructor.getID()}\n` +
          `My event data: ${data}\n` +
          `My testProp from config: ${this.config.testProp}`);
        break;
      default:
    }
  }
}
