# Example 5: Using datalayer.js in a single page app (SPA)
(WORK IN PROGRESS)

This example discusses a few possible approaches to use datalayer.js in a single page application (SPA). SPAs are a rather special environment for tag management and analytics because - as the name implies - there is only a single page load right at the beginning. Therefore the usual technique of passing data from the backend to the datalayer via `<meta>` tags doesn't work within an SPA's lifecycle.

## General approach
So what can we do? The solution is to manually broadcast `page-loaded` events from within the SPA's lifecycle, likely after receiving the required data for a newly loaded page (maybe through some async request from an API). From a technical perspective that's pretty simple to do:

```javascript
datalayer.whenReady().then(d7r => {
  d7r.broadcast('page-loaded', {
    page: {
      type: 'homepage',
      name: 'My Test Website'
    },
    site: { id: 'MySite' },
    user: {},
  });
});
```

When the datalayer becomes available we manually broadcast our `page-loaded` event and pass an object of type `D7rGlobalData` as parameter. This code could be executed anywhere in your application, e.g. inside a global state management (e.g. Redux middleware) or routing controller. The next section gives a more detailed example on that.

## Using the React Context API
A more React-specific solution could be based on the new [Context API in React 16.3](https://reactjs.org/docs/context.html). In that case we would need a Provider component around our Page that triggers `datalayer.initialize` with the correct configuration and/or re-scans the HTML for annotations and special markup.

```javascript
import datalayer from 'datalayerjs';
import { Datalayer, DatalayerData } from 'datalayerjs-react';

class App extends React.Component {
  render() {
    return (
      <Datalayer.Provider datalayer={datalayer}>
        <div>Your app content ...</div>
      </Datalayer.Provider>
    );
  }
}
```

## Using a Redux Middleware
When using Redux as state-handling framework it makes sense to create a dedicated middleware that takes datalayer metadata passed in via Redux actions. We'll approach that idea in a later example.

