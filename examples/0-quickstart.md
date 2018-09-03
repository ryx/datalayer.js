# Quickstart Tutorial

(THIS DOCUMENT IS STILL A WORK IN PROGRESS!)

This is an FAQ-style "quick start" tutorial to get you up and running with info and guideance about datalayer.js. It offers some theoretical and historical information first and then concentrates on the technical details. 

## 1. Background Info

### What is a datalayer and why do I need it?
> Feel free to skip this question, if you worked with tagmanagers or datalayers before. Most of this is meant to give an understanding of why developers should have a major interest in using a datalayer versus the "classical", sourcecode-level integration of 3rd party scripts.

A datalayer is all about moving information and data (e.g. about pages, categories, products, ...) from your application into a place where it is easily accessible. A "place" in this context just means "somewhere inside the user's browser", because all _datalayer interaction happens inside the client_. From there it gets passed on further, to analytics scripts, marketing pixels, conversion tracking and so on. So, technically, seen a datalayer is not more than some object, storing data in its properties.

Most datalayer implementations just take such data and then other parts of code can access and use it.

### What is Wrong with Existing Datalayers and Tagmanagers?
All external tagmanagers have one major problem: they take code control away from the developer and grant it to some marketing department or external agency. In most companies the developers are even happy about such a move, because they don't like to mess around with online marketing and analytics topics. But they heavily underestimate the potential negative impact on their product:

#### No Q/A Process
Most tagmanagers entirely lack a solid Q/A or review process, which leads to some kind of "legal code injection". Why? Because that is the definition of allowing unknown third parties to silently inject "blackboxed" code into a production environment. This problem can only be avoided by strong discipline, clear processes and very mature developers in your marketing agency. Unfortunately, this setup is pretty rare in reality. Most of the time such tasks are done by unexperienced junior devs, because the whole topic is rather unpopular among senior developers in general.

#### Synchronous (or too dominant) Integration
Tagmanagers, as most other vendor scripts, still treat themselves as "first class citizens" (whereas your product should be the only first class citizen). That's why they need to be integrated synchronously, or at least in the pages' head area. Which greatly increases the risk of performance drawbacks or critical Javascript errors, that may even halt the entire execution of your website.

#### Vendor Lock-In Included
Many tagmanagers cause a hard vendor lock-in because almost all bigger vendors ship their very own tag management software. Until now there is no consistency or standard among these systems (after all, that's why we created datalayer.js). Once you have settled for one or the other route, it becomes amazingly simple to buy the next couple of "solutions" from that specific vendor.

#### Encouraging Developer Ignorance
Developers tend to naturally ignore the code that is created within external tag management systems. It's "just marketing and tracking pixels" they really don't bother about. That's a very dangerous way of thinking, because all that code runs in very critical moments of the customer's journey on your website. Common situations are conversion-relevant events like variant changes, cart interactions, or checkout steps. If unrecognized errors occur in such places, and there are no continuous customer journey tests running on your system, this can cause major revenue loss.

### But my 3rd Party Vendor Told Me That ...
Face the ugly truth: third party vendors have a high interest to get you locked into their ecosystem and their dedicated tag management software. Once you have their system integrated it is easy to sell you the next product, which then is just "one click away". Of course they don't tell you horror stories about junior developers in some random agency blindly hacking around in your production code, causing subtle errors and hard-to-track bugs, ruining your CR. But that's the naked truth as we experienced it over and over again at HBC Europe and many of it's banners.

### What is Special About datalayer.js?
Datalayer.js is specifically designed for developers and testability, while minimizing business risks at the same time. Besides it's great technical flexibility, it is also very slim and lightweight and has a small memory and performance footprint. Some of it's more non-functional benefits include:

#### Integrated Testing Workflow
...

#### Better Time-to-Market for Analytics Integration
Improves the time-to-market of tracking and third party integration ...

#### Reduced Risk of Production Errors
D7r reduces the chance of business threats caused by 3rd-party-related performance impacts or production errors through its test-driven workflow ... 

#### Simplified Workflow Among Departments
Simplifies the communication and workflow between digital analytics, marketing and engineering departments because of a clearly specified (and strictly typed) data model

#### Puts Developers Back in Control
Puts developers in full control of the code they are running on their (or their clients') website



## 2. Technical Quickstart

### How do I use datalayer.js?
Datalayer.js can be included in many ways, so let's start with the easiest. 

### How do I put metadata on my page?
...
