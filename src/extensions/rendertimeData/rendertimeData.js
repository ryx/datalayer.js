/**
 * Offical datalayer.js core extension that parses the DOM for
 * special metatags with datalayer.js data.
 */
export default config => class RendertimeData {
  constructor(datalayer) {
    this.datalayer = datalayer;
    // init prerequisites
    // ...
  }

  // handle element scan (called before/after scanElementFor*)
  beforeScanElement(element) {
    // scan element for metadata
  }
};
