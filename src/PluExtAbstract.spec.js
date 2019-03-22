/* eslint-disable max-len */
import PluExtAbstract from './PluExtAbstract';

describe('PluExtAbstract', () => {
  it('should create a new PluExtAbstract instance with the expected id', () => {
    const expectedId = 'foo-123';

    const plugin = new PluExtAbstract(expectedId);

    expect(plugin.id).toEqual(expectedId);
  });

  it('should return its ID when getID is called', () => {
    const expectedId = 'foo-123';

    const plugin = new PluExtAbstract(expectedId);

    expect(plugin.getID()).toEqual(expectedId);
  });
});
