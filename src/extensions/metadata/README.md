# datalayer.js/extensions: metadata
Official datalayer.js core extension that allows passing in data and events using dedicated metatags.

## Info
This extension enables the "rendertime data" feature in datalayer.js. Rendertime data is the most convenient way to pass data from backend applications to the datalayer. You simply put <meta> tags into your markup (i.e. your website's HTML, no matter how that is generated) to pass "rendertime" data or events to the datalayer. This makes it extremely comfortable for backend-rendered applications to transport data into the frontend. It also saves you from using inline Javascript, because inline scripts are just bad for your karma ;-) ...

## Usage
First enable the extension in your code, then use metadata to provide rendertime events and data to datalayer.js.

```javascript
import { metadata } from 'datalayerjs';

datalayer.use(metadata());
```

### Rendertime markup
```xml
<meta name="d7r:data" content='{"page":{"type":"homepage","name":"My homepage"}}' />
```

## Options
Available configuration options for this extension are:
- metaPrefix: use to customize the `d7r:` part of the metatags used to pass the metadata
