# Example 8: Error Handling
(WORK IN PROGRESS)

This example shows a stategy to handle validation and lifecycle errors in datalayer.js.

## Handling Data Validation and Startup Errors
Datalayer.js provides a default way of handling startup errors. You can provide a validateData option for that purpose and easily catch the result using a Promise-chain.

```javascript
import MyPlugin from './some/module/myplugin';

datalayer
  .initialize({
    plugins: [
      new MyPlugin(),
    ],
    validateData: (data) => {
      if (!data.page) {
        throw new Error('Page data is missing');
      }
    }
  })
  .then((data) => {
    // everything fine, broadcast our page-loaded event
    datalayer.broadcast('page-loaded', data.page);
  })
  .catch((e) => {
    // Error occured, log error
    console.error('An error occured: ', e);
  });
```
