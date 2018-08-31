# Example 7: Creating your Own Datalayer Plugins
(WORK IN PROGRESS)

TODO: explain plugin lifecycle and flow here

## Examples
A simple example for a conversion plugin:

```javascript
import datalayer, { Plugin } from 'datalayerjs';

/**
 * Example of a common conversion tracking plugin.
 */
export default class SomePlugin extends Plugin {
  constructor(config) {
    super('somePlugin', config);
  }

  // perform 3rd party setup here
  onInitialized() {
    window._thirdParty = window._thirdParty || [];
    window._thirdParty.push(['init', config.someAccountId]);

    /* eslint-disable */
    var s = document.createElement('script');
    s.src = config.myTrackingUrl;
    s.async = true;
    document.querySelector('head').appendChild(s);
    /* eslint-enable */
  }

  // handle page-loaded event
  onPageLoaded(name, data) {
    switch(data.page.type) {
      case 'checkout-confirmation':
        // pass a fictional "product view" event to some third party
        window._thirdParty.push('productViewEvent', {
          sku: data.product.sku,
          price: data.product.priceData.total,
        });
        break;
      default:
    }
  }

  // optional: restrict plugin execution to relevant context
  shouldReceiveEvent(data) {
    return data.page.type === 'checkout-confirmation';
  }

  // central event handling method
  handleEvent(name, data) {
    switch (name) {
      case 'initialized':
        this.onInitialized();
        break;
      case 'page-loaded':
        this.onPageLoaded(name, data);
        break;
      // handle more events here (e.g. "cart-item-added", etc.)
      default:
    }
  }

  handleDestroy() {
    // TODO: plugin should remove itself from DOM again
  }
}
```
