// Important: The following lines are just used to fake a DOM, so we can
// run this using babel-node (contained in the npm package `babel-cli`)
// outside a real browser. Usually we would use common ES6 imports
// like the following instead:

// import datalayer, { Plugin } from '../src/datalayer';
// import { metadata, annotations } from 'datalayerjs/extensions';
//
// START: DOM fake (only for easy execution with babel-node)
import { JSDOM } from 'jsdom';

const mockdata = {
  page: { type: 'test', name: 'Test' },
  view: { type: 'homepage', name: 'Homepage' },
  site: { id: 'testing' },
  user: {},
};
const dom = new JSDOM(`<!DOCTYPE html>
<html>
  <body>
  <meta name="d7r:data" content='${JSON.stringify(mockdata)}' />
  <div id="annotationsDiv" data-d7r-event-view='{"name":"foo","data":{"bar":123}}'>Foo</div>
  </body>
</html>
`);
// stub dependencies
global.window = dom.window;
global.document = window.document;

// import datalayer and related libs
const datalayerjs = require('../src/datalayer');

const datalayer = datalayerjs.default;
const { Plugin } = datalayerjs;
const metadata = require('../extensions/metadata/metadata').default;
const annotations = require('../extensions/annotations/annotations').default;
// END: DOM fake

// import extensions
// import datalayer, { Plugin } from '../src/datalayer';
// import { metadata, annotations } from 'datalayerjs/extensions';

// Plugin test
/* eslint-disable class-methods-use-this */

class GlobalPlugin extends Plugin {
  constructor(config = {}) {
    super('my-global-plugin', config);
  }

  handleInit() {
    // setup third party resources
  }

  handleEvent(name, data) {
    switch (name) {
      case 'pageload':
        console.log('GlobalPlugin.handleEvent: Page loaded', data);
        break;
      case 'say-hello':
        console.log(`GlobalPlugin.handleEvent: Hello from ${this.config.testProp}, caught "${name}"`, data);
        break;
      default:
        console.log(`GlobalPlugin.handleEvent: ${name}`, data);
    }
  }
}

class ConversionPlugin extends Plugin {
  constructor(config = {}) {
    super('my-conversion-plugin', config);
  }

  handleInit() {
    // setup third party resources
  }

  shouldActivate(data) {
    return data.page.type === 'conversion';
  }

  handleEvent(name, data) {
    switch (name) {
      case 'pageload':
        console.log('ConversionPlugin.handleEvent: Page loaded', data);
        break;
      case 'say-hello':
        console.log(`ConversionPlugin.handleEvent: Hello from ${this.config.testProp}, caught "${name}"`, data);
        break;
      default:
        console.log(`ConversionPlugin.handleEvent: ${name}`, data);
    }
  }
}

/**
 * This is an example how to use datalayer.js in a real environment. It
 * is based on the assumption that the data is rendered into the markup
 * from the backend application, using the metadata extension.
 */
datalayer
  .use(metadata({ metaPrefix: 'd7r:' }))
  .use(annotations({ attributePrefix: 'd7r' }))
  .initialize({
    // data: mockdata,
    plugins: [
      new GlobalPlugin({ testProp: 'myplugin-private-number-1' }),
      new ConversionPlugin({ testProp: 'myplugin-private-number-2' }),
    ],
  })
  .whenReady()
  .then(() => {
    // should only get caught by global plugin
    datalayer.broadcast('say-hello');

    // for MPA's we would broadcast a "view-loaded" event with the globally available D7rPageData here
    // ...

    // for SPA's we might indicate a view change from somewhere inside the data flow (e.g. Redux)
    datalayer.broadcast('view-loaded', {
      type: 'checkout-completed',
      name: 'Thank You Page',
    });
  });
