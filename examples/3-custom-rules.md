# Example 3: Custom Rulesets to Finetune Plugin Loading

Plugins provide a configuration-based control over their loading via an optional second argument to their constructor, provided as a function. If this function returns `true` the plugin will receive events, otherwise it will be ignored during any calls to [broadcast](#). This is especially useful to notify plugins only under certain conditions, e.g. the availaibilty of a partner cookie or alike.

```javascript
import {
  ExampleConversionPlugin,
} from './myCustomPlugins';

datalayer.initialize({
  plugins: [
    // this plugin will only receive "page-loaded" events, and only if type is "checkout-completed"
    new ExampleConversionPlugin(
      { somePartnerId: 12343123 },
      (name, data) => name === 'page-loaded' && data.page.type === 'checkout-completed',
    );
  ]
});
```

Also check out the [attribution extension](../src/extensions/attribution) for examples on how to load plugins based on a given marketing attribution and/or campaign data.