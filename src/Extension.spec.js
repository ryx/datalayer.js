/* eslint-disable max-len */
import Extension from './Extension';

describe('Extension', () => {
  it('should create a new Extension instance with the expected id', () => {
    const expectedId = 'foo-123';

    const plugin = new Extension(expectedId);

    expect(plugin.id).toEqual(expectedId);
  });

  it('should return its ID when getID is called', () => {
    const expectedId = 'foo-123';

    const plugin = new Extension(expectedId);

    expect(plugin.getID()).toEqual(expectedId);
  });
});
