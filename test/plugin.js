// Important: The following lines are just used to fake a DOM, so we can
// run this using babel-node (contained in the npm package `babel-cli`)
// outside a real browser. Usually we would use common ES6 imports
// like the following instead:

// import datalayer from '../src/datalayer';
// import examplePlugin from './examplePlugin';
//
// START: DOM fake (only for easy execution with babel-node)
import td from 'testdouble';
import { JSDOM } from 'jsdom';

const mockdata = {
  page: { type: 'test', name: 'Test' },
  site: { id: 'testing' },
  user: {},
};
const dom = new JSDOM(`<!DOCTYPE html>
<html>
  <body>
  <meta name="dtlr:data" content='${JSON.stringify(mockdata)}' />
  <div id="annotationsDiv" data-dtlr-event-view='{"name":"foo","data":{"bar":123}}'>Foo</div>
  </body>
</html>
`);
td.replace('../src/lib/window', dom.window);

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
export default class ExamplePlugin extends Plugin {
  constructor(config = {}) {
    super('my-plugin-id', config);
  }

  handleInit() {
    // setup third party resources
  }

  handleActivate(data) {
    return data.page.type === 'test';
  }

  handleEvent(name, data) {
    switch (name) {
      case 'pageload':
        console.log('ExamplePlugin.handleEvent: Page loaded');
        break;
      case 'say-hello':
        console.log(`ExamplePlugin.handleEvent: Hello from ${this.getId()}\n` +
          `My event data: ${data}\n` +
          `My testProp from config: ${this.config.testProp}`);
        break;
      default:
        console.log(`ExamplePlugin.handleEvent: ${name}`, data);
    }
  }
}

/**
 * This is an example how to use datalayer.js in a real environment. It
 * is based on the assumption that the data is rendered into the markup
 * from the backend application, using the metadata extension.
 */
datalayer
  .use(metadata({ metaPrefix: 'dtlr:' }))
  .use(annotations({ attributePrefix: 'dtlr' }))
  .initialize({
    // data: mockdata,
    plugins: [
      new ExamplePlugin({ testProp: 'myplugin-private-number-1' }),
      new ExamplePlugin({ testProp: 'myplugin-private-number-2' }),
    ],
  })
  .whenReady()
  .then(() => {
    datalayer.broadcast('say-hello');
  });
