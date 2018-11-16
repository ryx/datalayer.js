/**
 * Offical datalayer.js core extension that performs attribution handling
 * based on a provided set of configuration rules.
 *
 * Attribution logic is based on our (internally used) attribution.js library,
 * that will follow as a dedicated and polished OSS library somewhen, too.
 *
 * Usage: provide AttributionEngine to extension and access attribution
 * data and touchpoints via `data.attribution`
 *
 * Copyright (c) 2016 - present, Rico Pfaus
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export default (config = {
  /**
   * The associated AttributionEngine.
   * @type {AttributionEngine | null}
   */
  engine: null,
}) => class Attribution {
  constructor(datalayer) {
    this.datalayer = datalayer;
  }

  /* eslint-disable class-methods-use-this */
  beforeInitialize() {
    if (!config.engine) {
      throw new Error('d7r/extensions/attribution.js: extension expects an engine entry in config');
    }

    // perform attribution handling based on provided engine
    const recognizedTouchpoint = config.engine.execute();

    // currently recognized touchpoint (might be null, e.g. for "firstPageViewOnly" channels)
    let currentTouchpoint = null;
    if (recognizedTouchpoint) {
      const recognizedChannel = recognizedTouchpoint.getChannel();
      currentTouchpoint = {
        id: recognizedChannel.getId(),
        label: recognizedChannel.getLabel(),
        campaign: recognizedTouchpoint.getValue(),
      };
    }

    // inject attribution data into datalayer
    return {
      attribution: {
        credits: config.engine.getAttributionItems().map((data) => {
          const touchpoint = data.getTouchpoint();
          return {
            touchpoint: {
              id: touchpoint.getChannel().getId(),
              label: touchpoint.getChannel().getLabel(),
              campaign: touchpoint.getValue(),
            },
            weight: data.getWeight(),
          };
        }),
        currentTouchpoint,
      },
    };
  }
};
