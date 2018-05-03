# datalayer.js

[![Build Status](https://travis-ci.org/ryx/datalayerjs.svg?branch=master)](https://travis-ci.org/ryx/datalayerjs)
[![npm version](https://badge.fury.io/js/datalayerjs.svg)](https://badge.fury.io/js/datalayerjs)

Datalayer.js is an open-source datalayer, tagmanager, and *"frontend middleware"*. It is based on a [customizable data model with a virtual type system](#models) and aims at standardizing and simplifying the process of 3rd party integration into modern websites. It follows a "developer first" philosophy, is fully test-driven and acts as a thin data proxy between the client and any third parties, which are provided by plugins.

> NOTE: this is still a **pre-release version**, we are actively working on our the first stable relase .. :boom:


## How does it work?
The Datalayer "collects" data from the website (i.e. it gets passed from different parts of your application) and aggregates it to one data object. Then the plugin loader starts loading the plugins based on a given rule configuration. Plugins will receive events which contain specific data and can take that data and offer it to third parties as desired. One example is the "page-loaded" event that passes the previously aggregated data object to the plugin. That's the big picture. (TODO: add link to details)

# Usage
The basic usage is pretty simple. The first thing to do is to install datalayer.js from [npm](https://www.npmjs.com).

    npm install datalayerjs

Next thing is to import the datalayer.js module. Even though the most common notation is likely to use ES6's `import` statement, datalayer.js comes as [UMD module](https://github.com/umdjs/umd) and supports [a variety of different import styles](examples/2-integration-styles.md). This example also assumes that we want to import some dummy plugins from another module. In a real-world scenario you might install some official plugins instead.

```javascript
import datalayer from 'datalayerjs';
import {
  SomeAnalyticsPlugin,
  SomeConversionPlugin,
} from './myCustomPlugins';
```

After including the datalayer.js module you have to call the [`initialize`](#initializeoptionsobject-void) method on the global instance to perform basic setup and tell datalayer.js which plugins to load. The `plugins` option is the recommended way to load plugins. You simply pass a list of plugins to be loaded and initialize them right away, using their constructor. This should cover the most common usecases, for more details check out the [Plugins Documentation section](). One thing to keep in mind is that this _leaves the entire decision about what data the plugin receives to the plugin itself_, as the plugins take data from your website according to their own preferences.

```javascript
datalayer.initialize({
  // load plugins according to their own ruleset
  plugins: [
    new SomeAnalyticsPlugin({ myTrackServer: '//test/foo' }),
    new SomeConversionPlugin({ mySpecialAttr: 'foo-123' }),
  ],
});
```

### Communicaton
The default way of communicating with datalayer.js relies on a small [Javascript API](#javascript-api). Sending events to the datalayer is as easy as calling the [`broadcast`](#broadcastnamestring-dataany-void) method from somewhere within your code.

```javascript
datalayer.broadcast('page-loaded', {"page":{"type":"homepage","name":"My homepage"}});
```

### Extensions
In a real application you'll likely want to use extensions since they provide more, really powerful, ways of interacting with the datalayer. One common usecase is the [metadata extension](src/extensions/metadata) which aggregates data from the markup and passes it to the datalayer. This can be done with:

```javascript
import metadata from 'datalayerjs/extensions/metadata';

datalayer
  .use(metadata({}))
  .initialize(...);
```

Check [the extensions folder](src/extensions) for additional information on available extensions.

## Testmode
TODO: explain testmode and its activation via URL


## Building and Bundling
After you have set up and configured your personal version of datalayer.js, it is time to build and package the datalayer core and its plugins into your global script bundle. We intentionally not provide a preferred method for that because it highly depends on the framework and tool landscape of your application or website. Common solutions are webpack, rollup or a more manual AMD-based setup using gulp or grunt. (TODO: provide examples for popular toolchains). Alternatively you might also include datalayer.js from a public CDN (e.g. [unpkg](https://unpkg.com)) and then simply embed it using a method of choice (see [Integration](#integration) for available options).

# Javascript API
Communication with datalayer.js happens through the Javascript API. The module itself contains exactly one object with the name `datalayer`. The object contains the following public methods (NOTE: with the [methodQueue extension](src/extensions/methodQueue) you can access all of the described public API methods via the method queue pattern):

## initialize(options:Object): void
Initialize the current datalayer instance with the given options. It is mandatory to call this once before the datalayer can be used. It sets up the data, scans for metatags/annotations and loads the requested plugins. It accepts the following options:

### data: Object
An object with globally available data used to initialize the datalayer. The provided data will be available for all plugins throughout the current application lifecycle.

### plugins: &lt;Array:datalayer.Plugin&gt;
An array with plugin instances to be used by the datalayer.

```javascript
datalayer.initialize({
  plugins: [{
    new AnalyticsPlugin({ accountId: 12345 }),
  }]
});
```

## whenReady(): Promise
This is the main entry point if you want to use any datalayer.js functionality outside of plugins. It is resolved when the `initialize` call is finished and all configured plugins are loaded based on the provided ruleset. You can bind to the returned Promise at any time during the app lifecycle to access the API. The global datalayer.js instance is passed as only argument to the `resolve` callback (you could also use the global instance as well but local variables are better practice).

```javascript
datalayer.whenReady().then((d7r) => {
  // access data in datalayer (data is fully aggregated and available at this point)
  console.log(d7r.getData());
})
```

## broadcast(name:string, [data:any]): void
Broadcast the given event with the name defined by `name` and the optional `data` object to all plugins. **Important:** Plugins that are not yet loaded (or get loaded somewhen in the future) will *receive all events* once they are loaded. This is an intentional design decision to ensure that no data is lost. The plugin's handleEvent method recieves a timestamp so the plugin can decide whether to react to events happening in the past (@TODO!).

```javascript
// broadcast event to all loaded plugins
datalayer.broadcast('my-cool-event', { foo: 'bar' })
```

## getData(): Object
Returns the global data as one big object. **Important:** If the function is called prior to initialization it will throw an error. Always wrap this call into a `whenReady` Promise if calling it from outside a plugin's lifecycle.

## getPluginByID(id:string): Object
Get plugin with the given id and return it. If the plugin is unknown, the function returns null. **Important:** If the function is called prior to initialization it will throw an error. Always wrap this call into a `whenReady` Promise if calling it from outside a plugin's lifecycle.

## parseDOMNode(element:HTMLElement): void
Parse the given DOM node and it's children and hand them over to the extensions for further logic and processing. **Important:** If you asynchronously add markup to your page (e.g. after AJAX calls, lazy loading, etc.) and that markup may contain any datalayer.js-relevant data, then you HAVE TO call `parseDOMNode` and pass it the newly added element - *after adding it to the DOM*! Otherwise the contained information won't be processed.


# Models
What are Models? Models are a fundamental part of any datalayer.js-driven website. They are the foundation for implementing and validating your data, without being mandatory from a technical perspective. They are, however, a very important cornerstone for collaboration between developers, business departments and digital analysts. Simply put, such a model just defines what data is expected on which page.

> A "model" in terms of datalayer.js is a single JSON document that defines at least two things: all available page types for a website and all virtual type definitions that are used by those page types. Types are defined using [Apache Avro](https://avro.apache.org/docs/current/).

Technically seen the model is nothing more than a big JSON object with a few different properties, as described in the next sections. You are also not limited to the available data types. Instead you are *completely free* (and even encouraged) to use your own type definitions instead of the default ones. But be warned - even if it has no real technical relevance it is maybe *the most important part of your entire datalayer structure*. If you get things wrong here, you'll miss something later. Of course you are free to extend the model at any time. But it will cause developer effort and discussion, so plan well ;) ..

## Types
The data expected by datalayer.js is defined by a set of conventions. These are based on a simple yet flexible, virtual type system, called a _model_. A page with a type of `category` for example might expect an object of type `CategoryData` holding information about the category. The model definition provides the schema that defines data and event patterns for your entire website. It ultimately defines which data ends up in your datalayer and what you can provide to third parties. Although, first and foremost, it is nothing more than a convention that guides other people (developers, analysts, marketers, product management, etc.) in understanding what data to expect (or provide) where. You can think of it as the single source of truth regarding the data provided to datalayer.js.

The `types` property in the model file contains schema definitions of the available data types that can be used throughout the rest of the model (namely the *pages* and *events* definitions). It is using [Apache Avro](https://avro.apache.org/docs/current/) to describe types so it can be parsed and processed, e.g. to automatically validate consistency of provided data on a website (we will eventually provide a validator for that purpose). Type definitions can become quite huge JSON structures

```json
{
  "types": [
    {
      "name": "DALPageData",
      "type": "record",
      "fields": [
        { "name": "id", "type": "string" },
      ]
    },
    {
      "name": "DALCategoryData",
      "type": "record",
      "fields": [
        { "name": "id", "type": "string" },
        { "name": "name", "type": "string" },
        { "name": "totalHits", "type": "int" },
        { "name": "eans", "type": "array", "items": "string" },
        { "name": "aonrs", "type": "array", "items": "string" },
        { "name": "productIds", "type": "array", "items": "string" },
        { "name": "variantIds", "type": "array", "items": "string" },
      ]
    },
  ]
}
```

## Pages
The `pages` property in the model describes which data is expected for the individual pagetypes. A *pagetype* can be described as a generic, "single purpose" type of page like a *homepage*, a *productlist* or a *productdetail*. As a rule of thumb you could say: if there is a dedicated template for a certain kind of page, then it should get it's own pagetype in the datalayer, too. On bigger websites this can easily become a list of tenth (or even hundreds) of different pagetypes. At Galeria Kaufhof we have a combination of webshop, corporate website, external websites and many more. We ended up having around a hundred different page types and even more events.

The pagetype definition uses the datatypes declared via the `types` property. There is one special pagetype called `*`. It stands for "any page throughout the entire website". Usually it is used to provide common information like page or site specifics.

```json
{
  "pages": {
    "*": {
      "page": { "type:": "DALPageData" }
    },
    "homepage": {},
    "search": {
      "search": { "type:": "DALSearchData" }
    },
    "category": {
      "category": { "type": "DALCategoryData" },
      "search": { "type": "DALSearchData", "mandatory": false }
    },
    "productdetail": {
      "product": { "type:": "DALProductData" },
    }
  }
}
```

## Events
Event tracking is mandatory for deeper customer journey analysis, so you will likely have various events that shall be propagated to your datalayer. Common events might be "product-added-to-cart", "login-form-submitted" or "layer-opened", depending on how fine-grained you want to analyze the user behaviour.

The `events` property in the model holds a description of all events available on your website and how their parameter signature should be. As already seen for the `pages`, the `events` use the same datatypes that have been defined using the `types` property.

```json
{
  "events": {
    "page-loaded": ["DALGlobalData"],
    "product-added": [{"product":"DALProductData"}]
  }
}
```


# Plugins
Datalayer.js provides a modular architecture where logic is encapsulated in plugins. Plugins provide a set of predefined lifecycle methods and can access the global data that is aggregated by the datalayer. They can also send their own events, although that is a rather uncommon case.

## Loading and Configuring Plugins
Plugins are defined by creating a new instance of their class. Most plugins are configured be passing a configuration object to their constructor on instantiation.

```javascript
const plugin = new ExamplePlugin({ key: 'value' });
```

If you want to define custom loading rules you can additionally pass an optional callback function as second argument. That way the usual `shouldReceiveEvent` mechanism is ignored. This is particularly useful for loading plugins depending on certain runtime conditions (e.g. the availability of a given marketing channel's cookie, specific URL parameters and so on).

```javascript
const plugin = new ExamplePlugin(
  { key: 'value' },
  (data) => data.page.type === 'checkout-completed',
);
```

## API
 Plugins are very simple Javascript objects, providing a `handleEvent` method as only convention. In fact they don't actually need to be classes at all, you could use a simple object literal as well. However, it is strongly recommended to use classes to better separate construction logic and event handling. The following example illustrates the basic structure of a plugin.

```javascript
class SomePlugin {
  constructor() {
    // perform any kind of setup here, e.g. add 3rd party script tag to DOM
  }

  shouldReceiveEvent(page) {
    // return true if page.type should be handled by this plugin
  }

  handleEvent(name, data) {
    // react on specific events sent by the datalayer and handle them
    // in any way the 3rd party requires
  }
}
```

By default the plugins receive only one system-generated event named `page-loaded`. This event is automatically fired by the datatlayer right after initialization. It contains the global data object as aggregated from the page. A possible `handleEvent` call, handling a `page-loaded`, could look like this:

```javascript
handleEvent(name, data) {
  switch (name) {
    case 'page-loaded': {
      if (data.page.type === 'productdetail') {
        console.log(data.product);
      }
    }
    default:
  }
}
```

## Plugin Lifecycle
If you have a traditional, server-rendered, multi-page website then the lifecycle of your plugins is pretty obvious. They are created somewhen during script initialization and destroyed when the user unloads the current page.

For single-page apps (SPAs) the lifecycle methods are extremely crucial.
@TODO: explain lifecycle methods


# Extensions
The core of datalayer.js can be easily extended with new functionality. The process is somewhat similar to other middleware libraries like e.g. [express](#) and works by adding extensions through the `use` method on the datalayer instance. The extension then automatically connects to certain event hooks and receives data and broadcasts.

## Using extensions
Usage example for one of the factory extensions, enabling the "event annotations" feature.
```javascript
import datalayer from 'datalayerjs';
import annotations from 'datalayerjs/extensions/annotations';

datalayer
  .use(annotations())
  .initialize(...);
```

## Extension API
Creating an extension is pretty easy. It just requires a simple module with the following structure.
```javascript
export default (config) => class ExampleExtension {
  constructor(datalayer) {
    this.datalayer = datalayer;
    // init prerequisites
    // ...
  }

  // handle element scan (called before/after scanElementFor*)
  beforeScanElement(element) {}

  afterScanElement(element) {}

  // handle event broadcast (called before/after broadcasting event to plugins)
  beforeBroadcast(name, data) {}

  afterBroadcast(name, data) {}
}
```

