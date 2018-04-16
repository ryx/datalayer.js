# Example 1: Importing and Initializing datalayer.js
(WORK IN PROGRESS)

This example shows a very simple initialization and setup of the datalayer and a single plugin. It is based on the assumption that the data is rendered into the markup from the backend application, using the metadata extension.

## Importing the Modules
First we import the datalayer module and the [metadata extension](../extensions/metadata/README.md) which are both part of the core package.

```javascript
import datalayer from 'datalayerjs';
import metadata from 'datalayerjs/extensions/metadata';
```

## Loading Extensions
Extensions are really important for some common tasks needed by almost any datalayer implementation. Maybe the most important one is the [metadata extension](../extensions/metadata/README.md) that allows using HTML `<meta>` tags to pass data from the markup to the datalayer.

Loading extensions should be the first operation on the datalayer instance. The datalayer offers a `use` method for that purpose.

```javascript
datalayer
  .use(metadata({
    metaPrefix: 'd7r:'
  }));
```

Extensions may receive a custom configuration that is defined immediately within the `use` statement as shown above. You can learn more about the individual configuration options by checking the README.md for the specific extension module.

## Initializing the Datalayer
The next step is to initialize the datalayer instance itself. This also involves loading and configuring plugins:

```javascript
import MyPlugin from './some/module/myplugin';

datalayer.initialize({
  plugins: [
    new MyPlugin({
      dynamicProp: 'I am specific to this single plugin instance',
    }),
  ],
})
```

## Using the Datalayer
Finally, we can use the datalayer to broadcast data to the plugins.

```javascript
datalayer.whenReady().then(d7r => {
  d7r.broadcast('page-loaded', {
    page: ...
    site: ...
    user: ...
  });
});
```
