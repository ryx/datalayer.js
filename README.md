# datalayer.js

An open-source datalayer, tagmanager, and *"frontend middleware"*, proxying data between the client and any third parties. Based on a [customizable data model with a virtual type system](#models), trying to standardize common 3rd party integration into today's websites.

           __      __        __                          _
      ____/ /___ _/ /_____ _/ /___ ___  _____  _____    (_)____
     / __  / __ `/ __/ __ `/ / __ `/ / / / _ \/ ___/   / / ___/
    / /_/ / /_/ / /_/ /_/ / / /_/ / /_/ /  __/ /  _   / (__  )
    \__,_/\__,_/\__/\__,_/_/\__,_/\__, /\___/_/  (_)_/ /____/
                                 /____/           /___/

# Info

## What is this exactly?
A *developer-first, in-sourced tag management system* without external GUI. A very mature set of *conventions and virtual types to ensure a deterministic data flow* between backend and frontend. An *event system and plugin loader* to pass data from the client space to 3rd parties. A fully *test-driven environment* to handle and *quality-test your marketing attribution*. Also a blessing if you ever intend to switch to another web analytics tool ([read our success story](#)). Likely even more.

Based on years of technical evolution and real-world problems we encountered and solved at Galeria Kaufhof and HBC Europe. Built mainly with scalability, testing and clear conventions in mind. Rewritten from the ground up to integrate with modern single-page applications as well as classical websites.

## How does it work?
The Datalayer collects data from the website (i.e. the developer passes data to it) and aggregates it to one data object. Then the plugin loader starts loading it's plugins based on a user-defined rule configuration (e.g. analytics scripts on each page, conversion pixels only on order confirmation, etc. ). Plugins then receive events which contain specific data (one is the "pageload" event that passes the previously aggregated data object to the plugin). Plugins can then pass data to third parties as desired. That's the big picture.

The data expected by datalayer.js is defined by a set of conventions which are based on a [virtual type system](#). A dedicated [model](#) exactly defines what data is expected on which page. A page with a type of `category` for example would expect an object of type `DALCategoryData` holding information about the category. Check the section [Models](#) for more information about how this is connected.

That's it. Almost. There are many more details and possibilities of course. You can learn more about [rendertime data](#), [rendertime events](#) and [runtime events](#). It's also really helpful to understand the concept of [Models](#). We have a set of [predefined datatypes](#) (mainly focused on e-commerce websites) and a [default model](#). As well as [custom data models](#). Then there is the [rules configuration](#) for the plugin loading. We have [configuration overrides](#). And if you think you know everything, go and check out the [extensions](#).

## But what is wrong with external tag management?
It depends. If you want, go and use some 3rd party tool. You might even be happy with it. However, if you are a developer or a bigger organization with multiple dev teams or just care about performance, stability, and code control you really want to [understand the ideas and motivations behind datalayer.js](#) and maybe even use it.

But don't get fooled by comments like "tag managers are great, because you don't need to change your software when you want to add new 'tags'". Honestly - how would you describe adding random scripts into a production environment, if not "changing the software"? Those people completely miss the fact that adding Javascript code (because that is what said "pixels" and "tags" are!) into a website is considered to be a *production deployment*. You insert new code into your *production environment*. Directly. Without CI testing. In most cases it is *untested, unknown, "blackbox" code*, written by some *unknown third party*.

So, what else can you think of that is more scary than putting someone else's code into your live environment? At least one thing. Letting someone else put someone else's code into your live environment. To scare you even more, it will most likely be a junior web designer in some marketing agency, led by online marketing departments without deeper technical knowledge. Yay! Welcome to the world of modern, external "tag management".


# Usage
The basic usage can be divided into three different parts - integration, configuration and runtime (with focus on passing data and events to datalayer and plugins). The following paragraphs give a short introduction to these three topics. For more detailed information, check the dedicated sections for each topic.

## Integration
Datalayer.js comes as [UMD module](https://github.com/umdjs/umd) which means you can use it either directly via a `<script>` tag, by using an AMD loader (e.g. [requirejs](http://requirejs.org/)) or as [commonJS module](http://wiki.commonjs.org/wiki/Modules/1.1) (e.g. nodejs's `require`). These brief examples illustrate the different styles:

### Using the Method Queue Pattern
The method queue pattern (MQP) offers a very simple, asynchronous, non-blocking script include that should work in almost any environment under any circumstances. It might feel a little old fashioned, but works reliably like nothing else.

```html
<script type="text/javascript" src="/path/to/datalayer.js" async></script>
<script>
_dtlrq = window._dtlrq || [];
_dtlrq.push('initialize', {});
</script>
```

### Using AMD-style includes
```javascript
require(['datalayerjs'], (datalayer) => {
  datalayer.initialize({});
});
```

### Using CommonJS style
ES6 import (might also use traditional `require` syntax instead)
```javascript
import datalayer from 'datalayerjs';
datalayer.initialize({});
```

## Configuration
After including the datalayer.js module you have to call the `initialize` method on the global instance to perform basic setup and tell datalayer.js which plugins to load. Options are provided using a configuration object that is passed to the initialize method. You can read more about the available options in the [documentation for the initialize method](#).

### Rules and Plugin Loading
The `rules` option ultimately controls which plugins to load when. It expects one or multiple function(s) in an array. Each function is expected to return an array with plugin instances. These functions are called during initialization, receive the global data as argument and then decide under which conditions a plugin will be created and receive events. Simply put - when a rule returns a plugin this plugin will receive events, otherwise it will be ignored during [broadcast](#). Read more about that under [Rule Configuration](#).

You might wonder why there is not just one single function? The multi-function approach is meant to better separate different types of rules and plugins. If everything is within one function it soon gets messy and more difficult to understand. However, you are free to use one single function for all your rules if that better suits your needs.

```javascript
import {
  SomeAnalyticsPlugin,
  SomeSocialMediaPlugin,
  SomeBidManagementPlugin,
  SomeConversionPlugin,
  SomeOtherConversionPlugin,
  ProductSearchConversionPlugin,
} from './myCustomPlugins';

datalayer.initialize({
  // ...
  rules: [
    // loaded on each page
    () => [ new SomeAnalyticsPlugin({ myTrackServer: '//test/foo' }) ],
    // loaded when page.type is either search, category or productdetail
    (data) => {
      if (['search', 'category', 'productdetail'].indexOf(data.page.type) > -1) {
        return [
          new SomeSocialMediaPlugin(),
          new SomeBidManagementPlugin(),
        ];
      }
    },
    // loaded when page.type is checkout-confirmation
    (data) => {
      if (data.page.type === 'checkout-confirmation') {
        return [
          new SomeConversionPlugin({ mySpecialAttr: 'foo-123' }),
          new SomeOtherConversionPlugin({ someAccountId: 'askfjh89uasd' }),
        ];
      }
    },
    // loaded when page.type is checkout-confirmation and campaign matches some specific advertiser
    (data) => {
      if (data.page.type === 'checkout-confirmation' && channelCampaign.match(/aff\/(.*)someAdvertiser\//)) {
        return [ new ProductSearchConversionPlugin({ mySpecialAttr: 'foo-123' })) ];
      }
    }
  ]
});
```

### Testmode
TODO: explain testmode and its activation via URL

## Passing Data
The first obvious question here might be "what data should I pass"? That's a good question and we will discuss it in detail in the next chapter, [Conventions](#). Let's first start with the "how". The default way of communicating with datalayer.js relies on a minimal script API that you include in your code and use it as you would do with any other library. There are more (extremely useful) ways of interaction, when using extensions. Check [/src/extensions](#) for additional information.

```javascript
datalayer.broadcast('pageload', {"page":{"type":"homepage","name":"My homepage"}});
```

## Building and Bundling
After you have set up and configured your personal version of datalayer.js, it is time to build and package the datalayer core and its plugins into your global script bundle. We intentionally not provide a preferred method for that because it highly depends on the system and tool landscape of your system. Common solutions are webpack, rollup or a more manual AMD-based setup using gulp or grunt. (TODO: provide examples for popular toolchains). Alternatively you might also include datalayer.js from a public CDN (e.g. [unpkg](https://unpkg.com)) and then simply embed it using a method of choice (see [Integration](#integration) for available options).


# Conventions
TODO

## Rendertime Data
TODO: explain rendertime data/events (take from old ODL docs)

### Data vs. Events
TODO: explain difference between data and events and their individual purpose

### Handle Rendertime Data From Asynchronous Calls
TODO: explain DOM re-scan

## Runtime Data
TODO: explain runtime data/events (take from old ODL docs)



# Models
The model definition provides the schema that defines data and event patterns for your entire website. It ultimately defines which data ends up in your datalayer and what you can provide to third parties. Although, first and foremost, it is nothing more than a convention that guides other people (developers, analysts, marketers, product management, etc.) in understanding what data to expect (or provide) where. You can think of it as the single point of truth of the "what and where of data" provided to datalayer.js.

Technically seen the model is nothing more than a big JSON object with a few different properties, as described in the next sections. You are also not limited to the available data types. Instead you are *completely free* (and even encouraged) to use your own type definitions instead of the default ones. But be warned - even if it has no real technical relevance it is maybe *the most important part of your entire datalayer structure*. If you get things wrong here, you'll miss something later. But don't worry, you are free to extend the model at any time. But it will cause developer effort and discussion, so plan well ;) ..

> A "model" in terms of datalayer.js is a single JSON document that defines at least two things: all available page types for a website, together with the data that is expected per page type, and all virtual type definitions that are used by those page types. Types are defined using [Apache Avro](https://avro.apache.org/docs/current/).

## Types
The `types` property in the model contains schema definitions of the available data types that can be used throughout the rest of the model (namely the *pages* and *events* definitions). It is using [Apache Avro](https://avro.apache.org/docs/current/) to describe types so it can be parsed and processed, e.g. to automatically validate consistency of provided data on a website (we will eventually provide a validator for that purpose). Type definitions can become quite huge JSON structures

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
The `pages` property in the model describes which data is expected for the individual pagetypes. A *pagetype* can be described as a generic, "single purpose" type of page like a *homepage*, a *productlist* or a *productdetail*. As a rule of thumb you could say that if you had a dedicated template for a certain page, then it should get it's own pagetype. On bigger websites this can easily become a list of tenth (or even hundreds) of different pagetypes. At Galeria Kaufhof we have a combination of webshop, corporate website, external websites and many more. We ended up having around a hundred different page types.

The pagetype definition uses the datatypes declared via the `types` property. There is one special pagetype called `*`. It stands for "each page throughout the entire website". Usually it is used to provide common information like page or site specifics.

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
      "category": { "type:": "DALCategoryData" },
      "search": { "type": "DALSearchData", "mandatory": false }
    },
    "productdetail": {
      "product": { "type:": "DALProductData" },
    }
  }
}
```

## Events
Tracking events is mandatory for deeper customer journey analysis, so you will likely have various events that shall be propagated to your datalayer. Common events could be "product-added-to-cart", "login-form-submit" or "layer-open", depending on how fine-grained you want to analyze the user behaviour.

The `events` property in the model holds a description of all events available on your website and how their parameter signature should be. As already seen for the `pages`, the `events` use the same datatypes defined through the `types` property.

```json
{
  "events": {
    "page-load": ["DALGlobalData"],
    "product-added": [{"product":"DALProductData"}]
  }
}
```

# Javascript API
The datalayer.js Javascript API is pretty simple and straightforward. The module itself contains exactly one object with the name `datalayer`. Import it either using ES6 `import` or CommonJS `require` syntax. The object contains the following public methods (Note: you can also use the method queue pattern through the global variable `_dtlrq` to access all of the described public API methods):

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
datalayer.whenReady().then((dtlr) => {
  // access data in datalayer (data is fully aggregated and available at this point)
  console.log(dtlr.getData());
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

## getPluginById(id:string): Object
Get plugin with the given id and return it. If the plugin is unknown, the function returns null. **Important:** If the function is called prior to initialization it will throw an error. Always wrap this call into a `whenReady` Promise if calling it from outside a plugin's lifecycle.

## scanElement(element:HTMLElement): void
Scans a given HTML element and its children for [rendertime data](#using-rendertime-markup) (e.g. `dl:data` or `dl:event` metatags) and [event annotations](#using-event-annotations) (e.g. `data-dl-event-*` attributes on HTML elements). If anything is found it gets either `broadcast`'ed to the plugins or - in case of event annotation - hooked up with the necessary event handling mechanism. **Important:** If you asynchronously add markup to your page (e.g. after AJAX calls, lazy loading, etc.) and that markup may contain any datalayer.js metatags or annotations, then you HAVE TO call `scanElement` and pass it the newly added element - *after adding it to the DOM*! Otherwise the metadata or annotations won't be processed.


# Plugins
Datalayer.js provides a modular architecture where logic is encapsulated in plugins. These may access the global data aggregated by the datalayer and also send and receive events.

## API
 Plugins are very simple Javascript objects, providing a `handleEvent` method as only convention. In fact they don't actually need to be classes at all, you could use a simple object literal as well. However, it is strongly recommended to use classes to better separate construction logic and event handling. The following example illustrates the basic structure of a plugin.

```javascript
class SomePlugin {
  constructor() {
    // perform any kind of setup here, e.g. add 3rd party script tag to DOM
  }

  handleEvent(name, data) {
    // react on specific events sent by the datalayer and handle them
    // in any way the 3rd party requires
  }
}
```

By default the plugins receive only one system-generated event named `pageload`. This event is automatically fired by the datatlayer right after initialization. It contains the global data object as aggregated from the page. A possible `handleEvent` call, handling a `pageload`, could look like this:

```javascript
handleEvent(name, data) {
  switch (name) {
    case 'pageload': {
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
Like in any good middleware, the core of datalayer.js can be easily extended with new functionality. The process is somewhat similar to other libraries like e.g. [express](#) and works by adding extensions through the `use` method on the datalayer instance. The extension then automatically connects to certain event hooks and receives data and broadcasts.

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
