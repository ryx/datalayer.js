// import datalayer from '../../datalayer';

/**
 * Official datalayer.js core extension that registers a MutationObserver to
 * automatically handle DOM changes and trigger a parseDOMNode on the changed
 * nodes.
 *
 * This extension does nothing by itself. It is designed to be used together
 * with the annotations and/or metadata extension(s).
 *
 * Copyright (c) 2018 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export default () => class Mutations {
  constructor(datalayer) {
    this.datalayer = datalayer;
    // init mutation observation on the DOM's root node ...
    this.observer = new window.MutationObserver(mutations => this.onHandleMutations(mutations));
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Handle mutations that were recognized by our MutationObserver instance.
   * @param {Array} mutations list of mutations
   */
  onHandleMutations(mutations) {
    // @FIXME: maybe restrict parsing to some specific data-* attribute?
    mutations.forEach((mutation) => {
      console.log('Mutation:', mutation);
      if (mutation.addedNodes.length) {
        console.log('Mutation:', mutation.addedNodes);
        mutation.addedNodes.forEach(node => this.datalayer.parseDOMNode(node));
      }
    });
  }
};
