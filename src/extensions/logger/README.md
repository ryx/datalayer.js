# datalayer.js/extensions: logger
Official datalayer.js core extension that adds logging output to the datalayer and its plugins. Without this extension the calls to `Datalayer.log` and `Plugin.log` simply don't have any effect.

## Info
In most real-world projects there will likely be an existing logging solution in the client space. This extension enables log output in datalayer.js and also offers a simple way to use your own custom logger. By default this extension passes the log output to the internal logging mechanism, which is just a simple wrapper for `console.log`. To add your own [custom logging instance](#custom-logger-instance), use the `logger` configuration option and pass in a logger of your choice.

## Usage
The default logging is easily enabled by using the extension in your code. *Important*: the logger extension should be the first of all extensions you pass to `Datalayer.use`, so it can immediately capture potential logging output by other extensions.

```javascript
import logger from 'datalayerjs/extensions/logger';

datalayer.use(logger());
```

You can control the visibility of the internal logger's debug output by setting a special localStorage item as illustrated in the following snippet. This entry is *unset* by default! Please note that this needs to be explictly set to `'1'` as string).

```javascript
localStorage.setItem('d7r:logging:enable', '1');
```

## Custom Logger Instance
The following examples illustrates the basic concept, using a very simple dummy logger.

```javascript
import logger from 'datalayerjs/extensions/logger';

const mySimpleLogger = {
  log: (...args) => console.log(...args);
};

datalayer.use(logger({ logger: mySimpleLogger }));
```



## Options
Available configuration options for this extension are:
- **logger**: use a custom logger instance (has to be compatible to the common `window.console` interface)
