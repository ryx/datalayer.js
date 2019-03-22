/**
 * Offical datalayer.js core extension that offers access to the global datalayer
 * instance through a global method queue.
 *
 * Copyright (c) 2016 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import Extension from '../../Extension';
/**
 * Create a method queue handler within the provided target object. It can be used to
 * communicate with the provided API without the need to directly access the module.
 *
 * @param context     {Object}  object scope in which to create method queue (e.g. window)
 * @param queueName   {String}  identifier to use as method queue name (e.g. "_odlq")
 * @param apiObj      {Object}  object scope to use for calling the provided methods on
 */
export const createMethodQueueHandler = (context, queueName, api = {}) => {
  function _mqExec(_api, _arr) {
    if (typeof _api[_arr[0]] === 'function') {
      /* eslint-disable prefer-spread */
      _api[_arr[0]].apply(_api, _arr.splice(1));
      /* eslint-enable prefer-spread */
    } else {
      throw new Error(`method "${_arr[0]}" not found in ${_api}`);
    }
  }
  // get the existing method queue array or create a new one
  let mq = [];
  if (typeof context[queueName] === 'undefined') {
    context[queueName] = mq;
  } else {
    mq = context[queueName];
  }
  // execute pending calls
  while (mq.length > 0) {
    _mqExec(api, mq.shift());
  }
  // override push method
  mq.push = (arr) => {
    _mqExec(api, arr);
  };
};

export default (config = { queueName: '_d7rq' }) => class MethodQueue extends Extension {
  constructor(datalayer) {
    super('MethodQueue', datalayer);
  }

  afterInitialize() {
    createMethodQueueHandler(window, config.queueName, this.datalayer);
  }
};
