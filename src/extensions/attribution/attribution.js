/**
 * Offical datalayer.js core extension that performs attribution handling
 * based on a provided set of configuration rules.
 *
 * Attribution logic is based on our (internally used) attribution.js library,
 * that will follow as dedicated and polished OSS library somewhen, too.
 *
 * Usage: provide attribution config to extension and access attribution
 * data and touchpoints via `data.attribution`
 *
 * Copyright (c) 2016 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  initAttribution,
  getAttributedChannel,
  getChannelConfigByName,
} from './_attribution';

export default (config = {
  cookieName: 'd7r:attribution',
  touchpointLifetime: 60 * 60 * 24 * 30,
  channels: [],
}) => class Attribution {
  constructor(datalayer) {
    this.datalayer = datalayer;
    this.globalData = {};
  }

  /* eslint-disable class-methods-use-this */
  beforeInitialize() {
    // init attribution lib and get current touchpoint
    const touchpoint = initAttribution(config);

    // perform attribution handling based on config
    const attributedChannel = getAttributedChannel() || {};

    // inject attribution data into datalayer
    return {
      attribution: {
        channel: {
          name: attributedChannel.c || '',
          campaign: attributedChannel.v || '',
          config: attributedChannel.c ? getChannelConfigByName(attributedChannel.c) : null,
        },
        touchpoint,
      },
    };
  }
};
