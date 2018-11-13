/* eslint-disable max-len, no-new */
import attribution from './attribution';

const { jsdom } = global;

describe('attribution', () => {
  describe('module', () => {
    it('should export a factory which returns the extension class', () => {
      expect(typeof attribution()).toBe('function');
    });
  });

  describe('extension factory', () => {
    it('should return an empty `attribution` object on calling "beforeInitialize", when running extension without attribution config', async () => {
      // datalayer.use(extension.default());
      const ExtensionContructor = attribution();
      const instance = new ExtensionContructor();

      const data = instance.beforeInitialize();

      expect(data.attribution).toEqual({
        credits: [],
        currentTouchpoint: null,
      });
    });

    it('should return currentTouchpoint and credits according to provided config when calling "beforeInitialize"', async () => {
      jsdom.reconfigure({ url: 'http://example.com?adword=my/campaign/123' });
      const ExtensionContructor = attribution({
        channels: [
          {
            name: 'sea',
            label: 'SEA (js)',
            type: 'match',
            match: 'adword',
            value: 'adword',
            canOverwrite: true,
          },
        ],
      });
      const instance = new ExtensionContructor();
      const expectedTouchpointData = {
        id: 'sea',
        label: 'SEA (js)',
        campaign: 'my/campaign/123',
      };

      const data = instance.beforeInitialize();

      expect(data.attribution).toEqual({
        credits: [{
          touchpoint: expectedTouchpointData,
          weight: 100,
        }],
        currentTouchpoint: expectedTouchpointData,
      });
    });
  });

  // TODO: test if attribution objects are properly set based on config
});
