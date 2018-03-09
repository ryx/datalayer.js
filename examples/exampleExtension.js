export default (config) => class ExampleExtension {
  constructor(datalayer) {
    this.datalayer = datalayer;
    // init prerequisites
    // ...
  }

  beforeInitialize(data, config) {}

  // handle element scan (called before/after scanElementFor*)
  beforeScanElement(element) {}
  afterScanElement(element) {}

  // handle event broadcast (called before/after broadcasting event to plugins)
  beforeBroadcast(name, data) {}
  afterBroadcast(name, data) {}

  beforeLoadPlugin(name) {}
}
