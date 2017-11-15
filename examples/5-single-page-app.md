# Example 5: Using datalayer.js in a single page app (SPA)
This example shows a possible approach to use datalayer.js in a single page app (SPA). SPAs provide a very special environment because - as the name implies - there is only a single page load right at the beginning. Therefore the usual approach to pass data from the backend to the datalayer using meta tags doesn't really work throughout an application's lifecycle.

A simple example that might be an approach when using React (Note: there is no datalayerjs-react module yet). Additionally we would need some smart component around our Page that triggers `datalayer.initialize` with the correct configuration and/or re-scans the HTML for annotations and special markup.

```javascript
// Possible React example
import datalayer from 'datalayerjs';
import { DatalayerProvider, DatalayerData } from 'datalayerjs-react';

class Page extends React.Component {
  render() {
    const { props } = this;
    return (
      <DatalayerProvider datalayer={datalayer}>
        <DatalayerData data={myTrackingData} />
        <div>Your page content ...</div>
      </DatalayerProvider>
    );
  }
}
```

So what else could we do? One solution could be to manually execute "load" events and add some way to disable the automatic `pageload` generation.

```javascript
import datalayer from '../src/datalayer';
import ExamplePlugin from './examplePlugin';

// This code and logic might be somewhere within your frameworks routing handling or Page
// component (in case of React). It likely follows this logic:
// 1) receive the required data for the current page (maybe through some async request from an API)
// 2) wait for datalayer to be ready
// 3) create the expected data object and broadcast it as a 'pageload' event
datalayer.whenReady().then((dtlr) => {
  // when the datalayer is available we manually broadcast the global "load" event,
  // passing an object of type DALGlobalData
  dtlr.broadcast('pageload', {
    page: { type: 'homepage', name: 'My Test Website' },
    site: { id: 'MySite' },
    user: {},
  });
});

// Initializing the global datalayer instance ist the same as in any other situation, but
// you only initialize the datalayer once throughout your entire application cycle (well,
// until the user hits reload of course).
datalayer
  .initialize({
    // disable automatic broadcasting of pageload events (we do this manually, since we only
    // have one pageload anyway in a common SPA)
    broadcastPageload: false,
    // provide plugins to be loaded, together with display rules and private configuration
    // (you can use the same plugin multiple times, with variying configuration)
    plugins: [
      {
        type: new ExamplePlugin({ testProp: 'myplugin-private-number-1' }),
        rule: true, // load on any page
      },
    ],
  })
  .then((dtlr) => {
    dtlr.broadcast('pageload', {
      page: { type: 'homepage', name: 'My Test Website' },
      site: { id: 'MySite' },
      user: {},
    });
  });
```
