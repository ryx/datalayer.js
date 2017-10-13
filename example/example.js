/**
 * This is an example how to use datalayer.js in a real environment.
 *
 * Important: The following lines are just used to fake a DOM, so we can
 * run this using babel-node (contained in the npm package `babel-cli`)
 * outside a real browser. Usually we would use common ES6 imports
 * instead.
 */
import td from 'testdouble';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html>');
td.replace('../src/lib/window', dom.window);
const datalayer = require('../src/datalayer').default;
const examplePlugin = require('./examplePlugin').default;

// @IMPORTANT: usually we would omit the above and just use common ES6 imports
// import datalayer from '../src/datalayer';
// import examplePlugin from './examplePlugin';

// wait for datalayer to be ready and broadcast a custom event
datalayer.whenReady().then(() => {
  console.log('datalayer.whenReady');
  datalayer.broadcast('say-hello', 'Hello from example.js');
});

// initialize global datalayer instance
datalayer.initialize({
  // optional: provide a model to be used for type validation
  model: null,
  // provide global data (of type DALGlobalData)
  data: {
    page: { name: 'My Test Website', type: 'homepage' },
    site: { id: 'MySite' },
    user: {},
  },
  // provide plugins to be loaded, together with display rules and private configuration
  // (you can use the same plugin multiple times, with variying configuration)
  plugins: [
    {
      // you can optionally provide an id to override the plugin's internal id
      // though this is only useful if you use the same plugin twice (might be the
      // case for certain conversion pixels)
      id: 'examplePluginFoo',
      // reference to plugin module
      type: examplePlugin,
      // rule callback that decides when to show the plugin (truthy return causes execution)
      rule: data => data.page.type === 'homepage',
      // optional: private configuration for plugins that can be customized
      config: {
        testProp: 'myplugin-private-number-1',
      },
    },
    {
      type: examplePlugin,
      rule: data => data.page.type === 'homepage',
      config: {
        testProp: 'myplugin-private-number-2',
      },
    },
  ],
});

// scan DOM for markup
// datalayer.scanForDataMarkup(document);
// datalayer.scanForEventMarkup(document);


