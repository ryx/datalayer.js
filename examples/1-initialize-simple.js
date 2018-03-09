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
 * from the backend application, using the metadata extension.
 *
 * Check 2-datalayer-single-page.js for an example on how to use
 * datalayer.js together with a single page application.
 */
datalayer
  .use(metadata({ metaPrefix: 'gk:dal' }))
  .use(annotations({ attributePrefix: 'dal' }))
  .initialize({
    plugins: [
      new ExamplePlugin({ testProp: 'myplugin-private-number-1' }),
      new ExamplePlugin({ testProp: 'myplugin-private-number-2' }),
    ],
  })
  .whenReady()
    .then(() => {
      datalayer.broadcast('say-hello', 'Hello from example.js');
    });
