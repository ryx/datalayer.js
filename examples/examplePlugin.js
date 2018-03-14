import { Plugin } from 'datalayerjs';
import { PAGETYPE_CONVERSION } from 'datalayerjs/types';

/**
 * Simple example plugin to demonstrate DAL functionality. Extensive comments
 * are intentional ;)
 */
export default class ExamplePlugin extends Plugin {
  /**
   * Constructor, just takes a configuration and sets up the internal plugin id. Never
   * do any DOM manipulation in here, use the lifecycle methods for any business logic
   * instead.
   * @param {Object} config
   */
  constructor(config = {}) {
    super('my-plugin-id', config);
  }

  /**
   * Initialize any DOM resources for this plugin. Called exactly once, when
   * the plugin is activated for the first time.
   */
  onInit() {
    // setup third party resources
  }

  /**
   * Decides whether this plugin will receive data within the current context.
   * The decision about load handling is done by the plugin to keep the config
   * short and clean. However, the datalayer configuration can overrule the
   * plugin's default and prohibit data access whenever necessary.
   * @param {DALPageData} data  the current data object for the current page context
   */
  onActivate(data) {
    return data.page.type === PAGETYPE_CONVERSION;
  }

  /**
   * Main event handling callback.
   * @param {string} name of event to be handled
   * @param {any} data event data, type and structure depend on event type
   */
  onEvent(name, data) {
    switch (name) {
      case 'pageload':
        console.log('Page loaded');
        break;
      case 'say-hello':
        console.log(`Hello from ${this.getId()}\n` +
          `My event data: ${data}\n` +
          `My testProp from config: ${this.config.testProp}`);
        break;
      default:
    }
  }
}
