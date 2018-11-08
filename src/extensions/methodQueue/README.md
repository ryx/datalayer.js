# datalayer.js/extensions: methodQueue
Official datalayer.js core extension that allows accessing the datalayer API through a global method queue.

## Info
This extensions makes it possible to access the datalayer using the method queue pattern (as known from popular affiliate tools). This can become handy if you need asynchronous access from completely separate environments. A common case might be an A/B testing tool where you are outside your own script space and heavily rely on external initialization processes. Datalayer.js intercepts any calls to `_d7rq.push` and executes the associated functions provided through the method queue.

## Usage
First enable the extension in your code

```javascript
import { methodQueue } from 'datalayerjs';

datalayer.use(methodQueue());
```

Then use the global method queue object to access datalayer.js from everywhere.
```javascript
_d7rq = window._d7rq || [];
_d7rq.push(['broadcast', 'my-cool-event', { foo: 'bar' }]);
```

## Options
Available configuration options for this extension are:
- variableName: the name of the global variable for the method queue (defaults to `_d7rq`)

## TODO
- provide API wrapper that offers a public interface instead of exposing the entire object
