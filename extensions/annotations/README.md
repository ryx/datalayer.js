# datalayer.js/extensions: annotations
Official datalayer.js core extension that allows to create datalayer events for common user interactions (click/focus/view) using a semantic annotation syntax.

## Info
This extension provides a simplified automation mechanism called "event annotations" that can be used for common event handling scenarios (e.g. click, focus, view). Such annotations are simply defined using a `data-dtlr-event-*` attribute in the markup and can be applied to any element in the DOM. Elements with such annotation get automatically attached with the respective event handlers. Besides the obvious simplicity, this approach has also the great benefit of being semantically explicit. Additonally it reduces the necessary Javscript glue code required when using the datalayer.js API directly.

```html
<a href="#" data-dtlr-event-click='{"name":"my-annotated-event","data":{"foo":"bar"}}'>Click me!</a>
```

The previous example shows a simple event annotation used to bind a click-Handler to an element. When the `<a>` tag is clicked it causes an event with the name `my-annotated-event` and the data `{foo: 'bar'}` to be broadcasted by datalayer.js. It has the same effect as manually adding an `onclick` handler on the element and executing `dal.broadcast('my-annotated-event', {"foo":"bar"})` in its callback.

## Usage
Simply enable the extension in your code, then use event annotations anywhere to easily broadcast datalayer events without setting up additional script logic.

```javascript
import annotations from 'datalayerjs/extensions/annotations';

datalayer.use(annotations());
```

### Click/Focus events
Automatically broadcast a click/focus event when a given element is clicked/focused.
```xml
<a href="#" data-dtlr-event-click='{"name":"some-link-click", "data":"link/to/page/123"}'>Some page</a>
```

### View events
View events are very common in webtracking, e.g. for cases where you want to tracking analytics information based on the visibility of certain page components (teaser, promotions, etc.). The view tracking is designed to be as painless as possible to use, but of course involves some more logic behind the scenes.

```xml
<div data-dtlr-event-view='{"name":"container-visible", "data":"my/container/123"}'>Put content here (e.g. a teaser) ..</div>
```

## Options
Available configuration options for this extension are:
- attributePrefix: use to customize the `dtlr` part of the `data-dtlr-event-*` attribute
