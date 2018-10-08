// tests if the mandatory exports work as expected
import datalayer, {
  Datalayer,
  Plugin,
} from './index';

describe('index', () => {
  it('should export the Datalayer class as named export', () => {
    // if the "extensions" property is defined we believe this to be the correct class
    expect((new Datalayer()).extensions).toBeDefined();
  });

  it('should export the Plugin class as named export', () => {
    // if the "_rulesCallback" property is defined we believe this to be the correct class
    expect((new Plugin())._rulesCallback).toBeDefined();
  });

  it('should export the datalayer singleton as default', () => {
    expect(datalayer).toBeInstanceOf(Datalayer);
  });
});
