# datalayer.js
An open-source datalayer, tagmanager and *"frontend middleware"* (I love this term), sitting between the client and any third parties. Based on a [heavily opinionated set of conventions and data types](#), trying to standardize common 3rd party integration into today's websites.

## What is this exactly?
A *developer-first, in-sourced tag management system* without external GUI. A very mature set of *conventions and virtual types to ensure a deterministic data flow* between backend and frontend. An *event system and plugin loader* to pass data from the client space to 3rd parties. A fully *test-driven environment* to handle and *quality-test your marketing attribution*. A blessing if you ever intend to switch to another web analytics tool (want to [understand this joke](#)?). Likely even more.

Based on years of technical evolution and real-world problems we encountered and solved at Galeria Kaufhof and HBC Europe. Built mainly with scalability, testing and clear conventions in mind. Rewritten from the ground up to integrate with modern single-page applications as well as classical websites.

## How does it work?
The Datalayer collects data from the website (i.e. the developer passes data to it) and aggregates it to one data object. Then the plugin loader starts loading it's plugins based on a user-defined rule configuration (e.g. analytics scripts on each page, conversion pixels only on order confirmation, etc. ). Plugins then receive events which contain specific data (one is the "pageload" event that passes the previously aggregated data object to the plugin). Plugins can then pass data to third parties as desired. That's the big picture.

One word about conventions. Datalayer.js has a strict set of conventions - based on a [virtual type system](#) - that exactly defines what data is expected in which situation. A page with a type of `"category"` for example would also expect an object of type `DALCategoryData` holding information about the category (see section [Models](#) for more info about how this is connected). If this expectation is unmet, it will complain on the console. This is absolutely essential to provide a solid base and virtual type safety for the plugins to work with.

That's it. Almost. There are many more details and possibilities of course. You can learn more about [rendertime data](#), [rendertime events](#), [runtime events](#) and [event annotations](#). It's also really helpful to understand the concept of [Models](#). We have a set of [predefined datatypes](#) (mainly focused on e-commerce websites) and a [default model](#). As well as [custom data models](#). Then there is the [rules configuration](#) for the plugin loading. We have [configuration overrides](#). And quite a bit more to come.

## But what is wrong with external tag management?
It depends. If you want, go and use some 3rd party tool. You might even be happy with it. However, if you are a developer or a bigger organization with multiple dev teams or just care about performance, stability and code control you really want to [understand the concepts and ideas behind datalayer.js](#) and maybe even use it.


# Usage

## Integration
Datalayer.js comes as [UMD module](https://github.com/umdjs/umd) which means you can use it either directly via a `<script>` tag, by using an AMD loader (e.g. [requirejs](http://requirejs.org/)) or as [commonJS module](http://wiki.commonjs.org/wiki/Modules/1.1) (e.g. nodejs's `require`).

## Configuration
After including the module you call the `initialize` method on the global instance to perform basic setup and tell datalayer.js which plugins to load.

```javascript
datalayer.initialize({
  metaPrefix: 'gk:',
  plugins: [

  ],

});
```

## Passing Data
There are three different ways to pass data to datalayer.js, each has it's own specific usecase.

### Using rendertime markup
This way is more applicable for classical, server-rendered websites. You put `<meta>` tags like the following in your markup (i.e. your website's HTML, no matter how that is generated) to pass "rendertime" data or events to the datalayer. Of course we are not using any inline Javascript because inline scripts are just bad for your karma (and highly discouraged, too) ;-)

```xml
<meta name="dljs:data" content='{"page":{"type":"homepage","name":"My homepage"}}' />
```

### Using the Javascript API
This way is primarily designed for modern single-page applications that render their data just once and then change dynamically without reloading the entire page. It might as well be used to dynamically pass data in other scenarios, though. It involves a common script API that you include and use as you would do with any other library. To be honest, this approach has much less of this "wow feeling" because it's just the common way of coding ;-)

```javascript
datalayer.broadcast('pageload', {"page":{"type":"homepage","name":"My homepage"}});
```

### Using the Method Queue Pattern (MQP)
It is possible to access the datalayer using a common method queue pattern. This can become handy if you need asynchronous access from completely separate environments. A common case might be an A/B testing tool where you are outside your own script space and heavily rely on external initialization processes. In such situations you can simply use the following pattern that is well-known from affiliate tools:

```javascript
_dalq = window._dalq || [];
_dalq.push(['broadcast', 'my-cool-event', { foo: 'bar' }]);
```


# Conventions
TODO

## Rendertime data
TODO

## Runtime data
TODO



# Models
The model definition provides the schema that defines data and event patterns for an entire website. Even though there is no validator yet, it is a convention that helps other people (developers, analysts, marketers, product management, etc.) understand what data to expect (or provide) where. You can think of it as the single point of truth of the "what and where of data" provided to datalayer.js. It is also really important to note that you are *completely free* to use your own type definitions instead of the default ones (in fact you are even expected to do that).

Technically the model is nothing more than a big JSON object with three different (mandatory) properties, as described below.

## Types
The `types` property in the model contains schema definitions of the available datatypes that can be used throughout the rest of the model (namely the *pages* and *events* definitions). It is using [Apache Avro](https://avro.apache.org/docs/current/) to describe types so it could be automatically parsed and processed (e.g. to validate consistency of provided data).

```json
{
  "types": [
    {
      "name": "DALSiteData",
      "type": "record",
      "fields": [
        { "name": "id", "type": "string" },
      ]
    },
    {
      "name": "DALPageData",
      "type": "record",
      "fields": [
        { "name": "type", "type": "string" },
        { "name": "name", "type": "string" },
      ]
    },
    {
      "name": "DALGlobalData",
      "type": "record",
      "fields": [
        { "name": "site", "type": "DALSiteData" },
        { "name": "page", "type": "DALPageData" },
        { "name": "user", "type": "union", "fields": ["null", "DALUserData"] },
      ]
    }
  ]
}
```

## Pages
The `pages` property in the model describes which data is expected for the individual page types.

```json
{
  "pages": {
    "*": {
      "site": "DALSiteData",
      "page": "DALPageData",
      "?user": "DALUserData"
    },
    "homepage": {},
    "search": {
      "search": "DALSearchData"
    },
    "category": {
      "category": "DALCategoryData",
      "?search": "DALSearchData"
    }
  }
}
```

## Events
The `events` property in the model describes which events are available and how their parameter signature should be. It can be used for runtime type checking, although that isn't yet implemented in the system.

```json
{
  "events": {
    "pageload": ["DALGlobalData"],
    "addtocart": [{"product":"DALProductData"}]
  }
}
```

# Javascript API
The datalayer.js Javascript API is pretty simple and straightforward. The module itself contains exactly one object with the name `datalayer`. Import it either using ES6 `import` or CommonJS `require` syntax. The object contains the following public methods (Note: you can also use the method queue pattern through the global variable `_dalq` to access all of the described public API methods):

## initialize(options:Object): void
Initialize the current datalayer instance with the given options (see section [Configuration](#configuration) for details). It is mandatory to call this once before the datalayer can be used. It sets up the data, scans for metatags/annotations and loads the requested plugins.

```javascript
datalayer.initialize({
  // options go here ...
});
```

## whenReady(): Promise
This is the main entry point if you want to use any datalayer.js functionality outside of plugins. It is resolved when the `initialize` call is finished and all configured plugins are loaded based on the provided ruleset. You can bind to the returned Promise at any time during the app lifecycle to access the API. The global datalayer.js instance is passed as only argument to the `resolve` callback (you could also use the global instance as well but local variables are better practice).

```javascript
datalayer.whenReady().then((dal) => {
  // access data in datalayer (data is fully aggregated and available at this point)
  console.log(dal.getData());
})
```

## broadcast(name:string, [data:any]): void
Broadcast the given event with the name defined by `name` and the optional `data` object to all plugins. **Important:** Plugins that are not yet loaded (or get loaded somewhen in the future) will *receive all events* once they are loaded. This is an intentional design decision to ensure that no data is lost. The plugin's handleEvent method recieves a timestamp so the plugin can decide whether to react to events happening in the past (@TODO!).

```javascript
// broadcast event to all loaded plugins
datalayer.broadcast('my-cool-event', { foo: 'bar' })
```

## loadPlugin(id:string): Promise
Load plugin with the given id and return a Promise. Once the plugin is loaded the Promise will be resolved with the plugin object instance as only parameter.

## getPlugin(id:string): Promise
Get plugin with the given id and return a Promise. If the plugin is loaded the Promise will be resolved with the plugin object instance as only parameter. If the plugin is not loaded and not scheduled for load, then the promise will be rejected with an error.

## scanHTMLElement(element:HTMLElement): void
Scans a given HTML element and its children for [rendertime markup](#) (e.g. `dl:data` or `dl:event` metatags) and [event annotations](#) (e.g. `data-dl-event-*` attributes on HTML elements). If anything is found it gets either `broadcast`'ed to the plugins or - in case of event annotation - hooked up with the necessary event handling mechanism. **Important:** If you asynchronously add markup to your page (e.g. after AJAX calls, lazy loading, etc.) and that markup may contain any datalayer.js metatags or annotations, then you HAVE TO call `scanHTMLElement` and pass it the newly added element - *after adding it to the DOM*! Otherwise the metadata or annotations won't be processed.


# Plugin API
 A very simple plugin might look like the following:

```javascript
export default class SomePlugin {
  handleEvent(name, data) {
    switch (name) {
      case 'pageload': {
        if (data.page.type === 'productdetail') {
          // pass a fictional "product view" event to some third party
          window._thirdParty.send('productViewEvent', {
            sku: data.product.sku,
            price: data.product.priceData.total,
          });
        }
      }
      default:
    }
  }
}
```
