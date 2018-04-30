# Example 3: Custom Rulesets to Finetune Plugin Loading

(WORK IN PROGRESS: **the feature described here is not yet available in the current datalayer.js version, but will be implemented in the near future**)

Plugins provide a configuration-based control over their loading via an optional second argument to their constructor, provided as a function. If this function returns `true` the plugin will receive events, otherwise it will be ignored during any calls to [broadcast](#). This is especially useful to notify plugins only under certain conditions, e.g. the availaibilty of a partner cookie or alike.

```javascript
import {
  ExampleConversionPlugin,
} from './myCustomPlugins';

datalayer.initialize({
  plugins: [
    // this plugin will only receive events if data.page.type equals "checkout-completed"
    new ExampleConversionPlugin(
      { somePartnerId: 12343123 },
      (data) => data.page.type === 'checkout-completed',
    );
  ]
});
```
