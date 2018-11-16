/* eslint-disable max-len, no-new */
import attribution from './attribution';
import datalayer from '../../datalayer';
import {
  AttributionEngine,
  LastTouchAttributionModel,
  URLMatchingChannel,
} from './_attribution-new';

const { jsdom } = global;

describe('attribution', () => {
  let [engine, model] = [];

  beforeEach(() => {
    model = new LastTouchAttributionModel();
    engine = new AttributionEngine(model, [
      new URLMatchingChannel('sea', 'SEA (js)', 'adword', 'adword', { canOverwrite: true }),
    ]);
  });

  describe('module', () => {
    it('should export a factory which returns the extension class', () => {
      expect(typeof attribution({ engine })).toBe('function');
    });
  });

  describe('use', () => {
    it('should be loadable without errors by the datalayer', () => {
      expect(() => datalayer.use(attribution({ engine }))).not.toThrow();
    });

    it('should execute the beforeInitialize callback and extend the provided data when use\'d', async () => {
      const extension = attribution({ engine });
      datalayer.use(extension);

      datalayer.initialize();

      expect(datalayer.getData()).toEqual(expect.objectContaining({
        attribution: {
          credits: [],
          currentTouchpoint: null,
        },
      }));
    });
  });

  describe('extension factory', () => {
    it('should return an empty `attribution` object on calling "beforeInitialize", when running extension without attribution config', () => {
      const ExtensionContructor = attribution({ engine });
      const instance = new ExtensionContructor(datalayer);

      const returnData = instance.beforeInitialize();

      expect(returnData).toEqual(expect.objectContaining({
        attribution: {
          credits: [],
          currentTouchpoint: null,
        },
      }));
    });

    it('should return currentTouchpoint and credits according to provided config when calling "beforeInitialize"', () => {
      jsdom.reconfigure({ url: 'http://example.com?adword=my/campaign/123' });
      const ExtensionContructor = attribution({ engine });
      const instance = new ExtensionContructor();
      const expectedTouchpointData = {
        id: 'sea',
        label: 'SEA (js)',
        campaign: 'my/campaign/123',
      };

      const returnData = instance.beforeInitialize();

      expect(returnData).toEqual(expect.objectContaining({
        attribution: {
          credits: [{
            touchpoint: expectedTouchpointData,
            weight: 100,
          }],
          currentTouchpoint: expectedTouchpointData,
        },
      }));
    });
  });

  // TODO: test if attribution objects are properly set based on config
});
