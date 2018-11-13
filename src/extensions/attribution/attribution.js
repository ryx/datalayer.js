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
    const recognizedTouchpoint = initAttribution(config);

    // perform attribution handling based on config
    const attributedChannel = getAttributedChannel();

    // @FIXME: the following two blocks should be replaced with a more elegant
    // interface for attribution.js - these "c" and "v" properties were never meant
    // to be exposed to the outer world ...
    // This is also currently hardcoded to a model with a single winning channel!

    // attributed channel/touchpoint (should always be set if config is correct)
    const touchpointCreditData = [];
    if (attributedChannel) {
      const attributedChannelConfig = getChannelConfigByName(attributedChannel.c);
      if (attributedChannelConfig) {
        touchpointCreditData.push({
          touchpoint: {
            id: attributedChannel.c,
            label: attributedChannelConfig.label,
            campaign: attributedChannel.v,
          },
          weight: 100,
        });
      } else {
        this.datalayer.log('Error: attributedChannelConfig not available for ', attributedChannel);
      }
    }

    // currently recognized touchpoint (might be null, e.g. for "firstPageViewOnly" channels)
    let currentTouchpoint = null;
    if (recognizedTouchpoint) {
      const recognizedTouchpointConfig = getChannelConfigByName(recognizedTouchpoint.c);
      if (recognizedTouchpointConfig) {
        currentTouchpoint = {
          id: recognizedTouchpoint.c,
          label: recognizedTouchpointConfig.label,
          campaign: recognizedTouchpoint.v,
        };
      } else {
        this.datalayer.log('Error: recognizedTouchpointConfig not available for ', recognizedTouchpoint);
      }
    }

    // inject attribution data into datalayer
    return {
      attribution: {
        credits: touchpointCreditData,
        currentTouchpoint,
      },
    };
  }
};
