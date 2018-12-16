/* eslint-disable max-len, no-new */
import {
  AttributionEngine,
  LastTouchAttributionModel,
  URLMatchingChannel,
  SearchEngineChannel,
  ReferrerMatchingChannel,
} from 'marketing.js';
import attribution from './attribution';
import datalayer from '../../datalayer';

const { jsdom } = global;

function setDocumentReferrer(referrer) {
  Object.defineProperty(window.document, 'referrer', { value: referrer, configurable: true, writable: true });
}

describe('attribution', () => {
  let [engine, model] = [];

  beforeEach(() => {
    model = new LastTouchAttributionModel();
    engine = new AttributionEngine(model, [
      new SearchEngineChannel('seo', 'SEO'),
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
      const ExtensionContructor = attribution({ engine: new AttributionEngine(model, []) });
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

    describe('data validation', () => {
      let extension;

      // helper to create new Extension with dedicated cookie (to avoid test interference)
      function createExtension(cookieName = 'attrData') {
        const modl = new LastTouchAttributionModel();
        const ExtensionContructor = attribution({
          engine: new AttributionEngine(modl, [
            new SearchEngineChannel('seo', 'SEO'),
            new URLMatchingChannel('sea', 'SEA (js)', 'adword', 'adword', { canOverwrite: true }),
            new ReferrerMatchingChannel('direct', 'Direct (js)', /^$/gi, { isFirstViewOnly: true }),
          ], 1800, cookieName),
        });
        return new ExtensionContructor();
      }

      beforeEach(() => {
        extension = createExtension();
        localStorage.removeItem('attrData');
      });

      it('should return an empty string for touchpoint.campaign if associated channel does not provide a campaign name', () => {
        setDocumentReferrer('https://google.com?q=foo');

        const returnData = extension.beforeInitialize();

        expect(returnData.attribution.currentTouchpoint.campaign).toEqual('');
      });

      it('should return null for currentTouchpoint on repeat views, if recognized channel "isFirstViewOnly"', () => {
        setDocumentReferrer('');
        jsdom.reconfigure({ url: 'http://example.com' });

        // first view
        const extension1 = createExtension('testRepeatView');
        const returnData1 = extension1.beforeInitialize();

        expect(returnData1.attribution.currentTouchpoint.id).toEqual('direct');

        // simulate repeat view
        const extension2 = createExtension('testRepeatView');
        const returnData2 = extension2.beforeInitialize();

        expect(returnData2.attribution.currentTouchpoint).toEqual(null);
      });
    });
  });
});
