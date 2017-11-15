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
const dom = new JSDOM('<!DOCTYPE html>');
td.replace('../src/lib/window', dom.window);
const datalayer = require('../src/datalayer').default;
const examplePlugin = require('./examplePlugin').default;
// END: DOM fake

/**
 * EXAMPLE 1: basic initialization of datalayer.js
 *
 * This is an example how to use datalayer.js in a real environment. It
 * is based on the assumption that the data is rendered into the markup
 * from the backend application, using "dal:data" meta tags.
 *
 * Check 2-datalayer-single-page.js for an example on how to use
 * datalayer.js together with a single page application.
 */

// wait for datalayer to be ready and broadcast a custom event
datalayer.whenReady().then(() => {
  datalayer.broadcast('say-hello', 'Hello from example.js');
});

// initialize global datalayer instance
datalayer.initialize({
  // provide plugins to be loaded, together with display rules and private configuration
  // (you can use the same plugin multiple times, with variying configuration)
  plugins: [
    {
      // reference to plugin module's class
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
