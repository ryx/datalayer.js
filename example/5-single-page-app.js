/**
 * EXAMPLE 5: Using datalayer.js in a single page app (SPA)
 *
 * This example shows a possible approach to use datalayer.js in a single page app (SPA).
 * SPAs provide a very special environment because - as the name implies - there is only
 * a single page load right at the beginning. Therefore the usual approach to pass data
 * from the backend to the datalayer using meta tags doesn't really work throughout the
 * application's lifecycle.
 *
 * So what else can we do? One solution is to manually execute "load" events. If you
 * omit the `data` property in the configuration object that is supplied to `initialize`,
 * you also suppress the initial 'load' event.
 */
import datalayer from '../src/datalayer';
import examplePlugin from './examplePlugin';

// This code and logic might be somewhere within your frameworks routing handling or Page
// component (in case of React). It likely follows this logic:
// 1) receive the required data for the current page (maybe through some async request from an API)
// 2) wait for datalayer to be ready
// 3) create the expected data object and broadcast it as a 'load' event
datalayer.whenReady().then(() => {
  // when the datalayer is available we manually broadcast the global "load" event,
  // passing an object of type DALGlobalData
  datalayer.broadcast('load', {
    page: { type: 'homepage', name: 'My Test Website' },
    site: { id: 'MySite' },
    user: {},
  });
});

// Initializing the global datalayer instance ist the same as in any other situation, but
// you only initialize the datalayer once throughout your entire application cycle (well,
// until the user hits reload of course).
datalayer.initialize({
  // provide plugins to be loaded, together with display rules and private configuration
  // (you can use the same plugin multiple times, with variying configuration)
  plugins: [
    {
      type: examplePlugin,
      rule: true, // load on any page
      config: {
        testProp: 'myplugin-private-number-1',
      },
    },
  ],
});
