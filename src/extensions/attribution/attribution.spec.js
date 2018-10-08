/* eslint-disable max-len, no-new */
import attribution from './attribution';

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
        channel: {
          campaign: '',
          name: '',
          config: null,
        },
        touchpoint: null,
      });
    });
  });

  // TODO: test if attribution objects are properly set based on config
});
