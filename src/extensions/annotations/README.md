# datalayer.js/extensions: annotations
Official datalayer.js core extension that allows to create datalayer events for common user interactions (click/focus/view) using a semantic annotation syntax.

## Info
This extension provides so called "event annotations" that greatly simplify the vast majority of event handling scenarios (e.g. click, focus, view). Such annotations are simply defined using a `data-d7r-event-*` attribute in the markup and can be applied to any element in the DOM. Elements with such annotation get automatically attached with the respective event handlers. Besides the obvious simplicity, this approach has the advantage of being semantically explicit. Additionally, it reduces the necessary Javascript glue code required when using the datalayer.js API directly.

## Usage
First enable the extension in your code, then use event annotations anywhere to easily broadcast datalayer events without setting up additional script logic.

```javascript
import annotations from 'datalayerjs/extensions/annotations';

datalayer.use(annotations());
```

### Click events
The following example shows a simple event annotation used to bind a click-Handler to an element. When the `<a>` tag is clicked it causes an event with the name `my-annotated-event` and the data `{foo: 'bar'}` to be broadcasted by datalayer.js. It has the same effect as manually adding an `onclick` handler on the element and executing `dal.broadcast('my-annotated-event', {"foo":"bar"})` in its callback.

```html
<a href="#" data-d7r-event-click='{"name":"my-annotated-event","data":{"foo":"bar"}}'>Click me!</a>
```

### Focus events
Automatically broadcast a focus event when a given element is focused. Same pattern as with click events, triggers a datalayer.broadcast when receiving a "focus" event on the associated element.
```xml
<input type="text" data-d7r-event-focus='{"name":"some-element-focus", "data":"form/input/123"}' />
```

### View events
Broadcast a datalayer event when an element becomes visible. View events are very common in webtracking, e.g. for cases where you want to track analytics information based on the visibility of certain page components (teaser, promotions, etc.). Usually it is rather complicated and involves a lot of custom code and/or third party libs to track those events. With datalayer.js the view tracking is designed to be as painless as possible to use, hiding all the associated logic behind the scenes.

```xml
<div data-d7r-event-view='{"name":"container-visible", "data":"my/container/123"}'>Put content here (e.g. a teaser) ..</div>
```

## Options
Available configuration options for this extension are:
- attributePrefix: use to customize the `d7r` part of the `data-d7r-event-*` attribute
