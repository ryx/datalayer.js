import { Plugin } from 'datalayerjs';
import { PAGETYPE_CONVERSION } from 'datalayerjs/types';

/**
 * Simple example plugin to demonstrate DAL functionality. Extensive comments
 * are intentional ;)
 */
export default class ExamplePlugin extends Plugin {
  /**
   * Return the plugin's unique ID. Plugins have to provide an id by convention,
   * this is required for configuration overrides and also helpful for debugging.
   * @return {String} id of the plugin
   */
  static getId() {
    return 'my/test/examplePlugin';
  }

  /**
   * Decides whether this plugin will receive data within the current context.
   * The decision about load handling is done by the plugin to keep the config
   * short and clean. However, the datalayer configuration can overrule the
   * plugin's default and prohibit data access whenever necessary.
   * @param {DALPageData} data  the current data object for the current page context
   */
  handleActivate(data) {
    return data.page.type === PAGETYPE_CONVERSION;
  }

  /**
   * Main event handling callback.
   * @param {string} name of event to be handled
   * @param {any} data event data, type and structure depend on event type
   */
  handleEvent(name, data) {
    switch (name) {
      case 'pageload':
        console.log('Page loaded');
        break;
      case 'say-hello':
        console.log(`Hello from ${this.constructor.getId()}\n` +
          `My event data: ${data}\n` +
          `My testProp from config: ${this.config.testProp}`);
        break;
      default:
    }
  }
}
