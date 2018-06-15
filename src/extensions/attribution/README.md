# datalayer.js/extensions/attribution
Official datalayer.js core extension that allows a highly flexible marketing channel recognition and marketing attribution handling.

## Info
This extension records a history of channel touchpoints based on a given configuration and provides access to the resulting data by extending the datalayer's global data.

## Usage
The attribution extension creates an `attribution` property in the datalayer's global data. You can then perform conditional operations against the attribution data, e.g. from within a plugin's custom rules handler. That way it is easily possible to only load a plugin if a certain attribution criteria is fulfilled.

```javascript
new MyTestPlugin(
  { accountId: 'abc123' },
  (data) => {
    // only execute on the conversion page, if the attribution data matches a given campaign
    return data.page.type === 'conversion' &&
      data.attribution.channel === 'affiliate' &&
      data.attribution.campaign.match(/fooPartner\//g);
  },
);
```

## Related Data Types
The attribution data has the following type signature (see [documentation about datalayer.js models and types](https://github.com/ryx/datalayerjs#models) for details):

### D7rAttributionData
Global attribution data that gets assigned to `data.attribution` when extension is used.

```javascript
{
  "name": "D7rAttributionData",
  "type": "record",
  "fields": [
    {
      "name": "channel",
      "type": "D7rChannelData", // @FIXME: should be union with null!!
      "info": "Recognized channel for the current page impression"
    },
    {
      "name": "touchpoint",
      "type": "D7rTouchpointData", // @FIXME: should be union with null!!
      "info": "Recognized touchpoint for the current page impression"
    }
  ]
}
```

### D7rChannelData
Contains data about a specific campaign and the associated marketing channel. Used in conjunction with the attribution extension.

```javascript
{
  "name": "D7rChannelData",
  "type": "record",
  "fields": [
    {
      "name": "channel",
      "type": "string",
      "info": "Channel name."
    },
    {
      "name": "campaign",
      "type": "string",
      "info": "Campaign name."
    }
  ]
}
```

### D7rTouchpointData
Contains data about one specific touchpoint, created when a new instance of the attribution.js is spawned.

```javascript
{
  "name": "D7rTouchpointData",
  "type": "record",
  "fields": [
    {
      "name": "timestamp",
      "type": "int",
      "info": "Timestamp (in milliseconds) when this touchpoint was created."
    },
    {
      "name": "channel",
      "type": "D7rChannelData",
      "info": "Associated channel that lead to this touchpoint."
    }
  ]
}
```