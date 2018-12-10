/* eslint-disable max-len */
import Plugin from './Plugin';

describe('Plugin', () => {
  it('should create a new Plugin instance with the expected id', () => {
    const expectedId = 'foo-123';

    const plugin = new Plugin(expectedId);

    expect(plugin.id).toEqual(expectedId);
  });

  it('should return its ID when getID is called', () => {
    const expectedId = 'foo-123';

    const plugin = new Plugin(expectedId);

    expect(plugin.getID()).toEqual(expectedId);
  });

  it('should create a new Plugin instance with the expected configuration', () => {
    const expectedConfig = { attr: '123' };

    const plugin = new Plugin('foo', expectedConfig);

    expect(plugin.config).toEqual(expectedConfig);
  });

  it('should create a new Plugin instance with the given rulesCallback', () => {
    const expectedRulesCb = () => {};

    const plugin = new Plugin('foo', {}, expectedRulesCb);

    expect(plugin._rulesCallback).toEqual(expectedRulesCb);
  });

  it('should return true when shouldReceiveEvent is called without custom rulesCallback', () => {
    const plugin = new Plugin('foo');

    expect(plugin.shouldReceiveEvent()).toBe(true);
  });

  it('should execute the defined rulesCallback and pass though the given data when shouldReceiveEvent is called', () => {
    const expectedRulesCb = jest.fn();
    const expectedData = { foo: 'bar' };
    const plugin = new Plugin('foo', {}, expectedRulesCb);

    plugin.shouldReceiveEvent('my-event', expectedData);

    expect(expectedRulesCb).toHaveBeenCalledWith('my-event', expectedData);
  });
});
