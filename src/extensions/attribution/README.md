# datalayer.js/extensions/attribution
Official datalayer.js core extension that allows a highly flexible marketing channel recognition and marketing attribution handling.

## Info
This extension records a history of channel touchpoints based on a given configuration and provides access to the resulting data by extending the datalayer's global data. It is built upon [marketing.js](https://github.com/ryx/marketing.js), an attribution and marketing channel handlig library.

## Usage
The attribution extension creates an `attribution` property in the datalayer's global data. You can then perform conditional operations against the attribution data, e.g. from within a plugin's custom rules handler. That way it is easily possible to only load a plugin if a certain attribution criteria is fulfilled.

```javascript
import { attribution } from 'datalayerjs';
import {
  AttributionEngine,
  LastTouchAttributionModel,
  SearchEngineChannel,
  URLMatchingChannel,
} from 'marketing.js';

datalayer
  .use(attribution({
    // create our AttributionEngine, see marketing.js docs for details
    engine: new AttributionEngine(
      new LastTouchAttributionModel(),
      [
        new SearchEngineChannel('seo', 'SEO'),
        new URLMatchingChannel('sea', 'SEA (Adwords)', 'adword', 'adword'),
      ]
    )
  }))
  .initialize({
    plugins: [
      new MyTestPlugin(
        { accountId: 'abc123' },
        (data) => {
          // only execute on the conversion page, if the attribution data matches a given campaign
          return data.page.type === 'conversion' &&
            data.attribution.current.length > 0 &&
            data.attribution.current[0].id === 'affiliate' &&
            data.attribution.current[0].campaign.match(/fooPartner\//g);
        },
      ),
    ]
  })
```

## Example Data
Let's assume a user visits our webshop by clicking an ad on some website. A few days later she comes back by clicking an SEA link in a Google search result. Another few days later she comes back by directly typing in the URL into her browsers address bar and completes her conversion. This little journey created three touchpoints, one using an "affiliate" channel, one using an "SEA" channel and one using a "direct" type-in.

The following example illustrates the resulting data of this journey. For the sake of simplicity, we use a ["Last Interaction" (or "Last Click") model](https://support.google.com/analytics/answer/1665189) for the attribution here so there is exactly one touchpoint getting all the credit. We also assume that "direct" is not allowed to override SEA (common scenario because the paid channel shouldn't be overridden), so SEA wins here. In terms of data the touchpoint in `attribution.credits[0].touchpoint` represents our winning channel, while `attribution.currentTouchpoint` contains the touchpoint data for the current page impression.


```javascript
{
  "attribution": {
    "credits": [
      {
        "touchpoint": {
          "id": "sea",
          "label": "SEA (Google Adwords)",
          "campaign": "my/custom/campaign/123"
        },
        "weight": 100
      }
    ],
    "currentTouchpoint": {
      "id": "direct",
      "label": "Direct Type-in",
      "campaign": ""
    }
  }
}
```

## Related Data Types
The attribution data has the following type signature (see [documentation about datalayer.js models and types](https://github.com/ryx/datalayerjs#models) for details). The types are expressed using [Typescript interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html) for convenience, but **Typescript is in no way necessary to use this** in your project. We could have equally used C or Java or any other strictly typed language for this list.

### D7rAttributionData
Global attribution data that gets assigned to `data.attribution` when extension is used.

```typescript
interface D7rAttributionData {
  /**
   * List with attributed touchpoints for the current conversion journey (i.e.
   * after applying chosen attribution model to available touchpoint history).
   * May be an empty array (if no attribution is available), but HAS TO be defined.
   */
  credits: D7rTouchpointAttributionData[];

  /**
   * Entire touchpoint history for all journeys created by this customer
   */
  currentTouchpint: D7rTouchpointData | undefined;
}
```

### D7rTouchpointCreditData
Contains data about a single attributed touchpoint and the weight it had for the entire conversion journey. This data is the result of applying a specific attribution model logic to a list of touchpoints. The `weight` can be any numerical value, but it is recommended to use percentage values adding up to a total of 100 for all attributed touchpoints connected to a single `DALAttributionData` object.

```typescript
interface D7rTouchpointCreditData {
  /**
   * Touchpoint that gets attributed. The contained touchpoint HAS TO occur in the
   * `history` array of the associated D7rAttributionData, too.
   */
  touchpoint: D7rTouchpointData;

  /**
   * The weight defines the percentage of the credit this touchpoint receives
   * from the entire attribution. E.g. n a first- or last-click model this would
   * be set to 100.
   */
  weight: number;
}
```

### D7rTouchpointData
Contains data about one individual touchpoint. This gets created whenever attribution.js recognizes a touchpoint based on a user interaction or an attribution credit.

```typescript
interface D7rTouchpointData {
  /**
   * ID (unique identifier) of associated channel that lead to this touchpoint. This
   * reflects the value that was passed in the attribution.js configuration. Common
   * values for this are the media and/or marketing channel type (sea/seo/...).
   */
  id: string;

  /**
   * Display name of associated channel. This is also taken from the attribution.js
   * configuration object. The contained value is likely what marketers want to
   * see inside their reports so this value is usually passed to analytics
   * tools.
   */
  label: string;

  /**
   * Associated campaign identifier that lead to this touchpoint.
   */
  campaign: string;
}
```
