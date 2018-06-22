/* eslint-disable max-len, no-new */
// import datalayer from '../../datalayer';

// properly define implicit globals
const {
  describe,
  it,
  beforeEach,
  expect,
} = global;

describe('attribution', () => {
  let [extension] = [];

  beforeEach(() => import('./attribution.js').then((m) => { extension = m; }));

  describe('module', () => {
    it('should export a factory which returns the extension class', () => {
      expect(typeof extension.default()).toBe('function');
    });
  });

  describe('extension factory', () => {
    it('should return an empty `attribution` object on calling "beforeInitialize", when running extension without attribution config', async () => {
      // datalayer.use(extension.default());
      const ExtensionContructor = extension.default();
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
