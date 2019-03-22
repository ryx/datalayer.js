/* eslint-disable class-methods-use-this, no-unused-vars */
import PluExtAbstract from './PluExtAbstract';
/**
 * Baseclass for datalayer.js extensions.
 */
export default class Extension extends PluExtAbstract {
  /**
   * Create a new Extension instance. Child classes have to explicitly set the id
   * and pass through any additional arguments to the superconstructor.
   * @param {String} id unique identifier
   * @param {Object} datalayer.js instance
   */
  constructor(id, datalayer) {
    super(id);
    this.datalayer = datalayer;
  }

  /**
   * Before initialize hook - gets called before datalayer gets initialized.
   */
  beforeInitialize() {}

  /**
   * After initialize hook - gets called after datalayer has been initialized.
   */
  afterInitialize() {}

  /**
   * before parse DOM node hook - can be called through datalayer instance.
   * @param element
   */
  beforeParseDOMNode(element) {}
}
