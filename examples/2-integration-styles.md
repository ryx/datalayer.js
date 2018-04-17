# Example 2: The Various Integration Styles
(WORK IN PROGRESS)

Datalayer.js comes as [UMD module](https://github.com/umdjs/umd) which means you can import it using a variety of different styles and module systems. You can choose between ES6-style `import` statements, direct import via a `<script>` tag, using an AMD loader (e.g. [requirejs](http://requirejs.org/)) or by using [commonJS module](http://wiki.commonjs.org/wiki/Modules/1.1) (e.g. nodejs's `require`). These brief examples illustrate the different styles:

### Using ES6-style imports
The most common way might be to use the ES6 import notation (though you might also use traditional `require` syntax instead).
```javascript
import datalayer from 'datalayerjs';

datalayer.initialize({});
```

### Using AMD-style includes
AMD-style includes are available, too. This example also show loading one of the core extensions as module dependency.
```javascript
require(['datalayerjs', 'datalayerjs/extensions/annotations'], (datalayer, annotations) => {
  datalayer
    .use(annotations())
    .initialize({});
});
```

### Using the Method Queue Pattern
The method queue pattern (MQP) integration is available through the [methodQueue extension](#). It offers a very simple, asynchronous, non-blocking script include that should work in almost any environment under any circumstances. It might feel a little old fashioned, but works reliably like nothing else. Important: when using this integration you need to pass in the extensions to be loaded via the `data-datalayer-config` attribute. Otherwise the method queue won't be available.

```html
<script
  type="text/javascript"
  src="/path/to/datalayer.js"
  async
  data-datalayer-config='{"extensions":["methodQueue"]}'
></script>
<script>
_d7rq = window._d7rq || [];
_d7rq.push('initialize', {});
</script>
```
