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
    super(config, 'some-plugin');
  }

  handleInit() {
    // perform 3rd party setup here and inject our config values
    window._thirdParty = window._thirdParty || [];
    window._thirdParty.push(['init', config.someAccountId]);

    /* eslint-disable */
    var s = document.createElement('script');
    s.src = config.myTrackingUrl;
    s.async = true;
    document.querySelector('head').appendChild(s);
    /* eslint-enable */
  }

  shouldReceiveEvent(page) {
    return page.type === 'checkout-confirmation';
  }

  /* eslint-disable class-methods-use-this */
  handleEvent(name, data) {
    switch (name) {
      case 'initialize':
        break;
      case 'pageload':
        switch (data.page.type) {
          case 'checkout-confirmation':
            // pass a fictional "product view" event to some third party
            window._thirdParty.push('productViewEvent', {
              sku: data.product.sku,
              price: data.product.priceData.total,
            });
            break;
          default:
        }
        break;
      // maybe handle more events here (e.g. "addtocart", etc.)
      default:
    }
  }

  handleDestroy() {
    // TODO: plugin should remove itself from DOM again
  }
}
```
