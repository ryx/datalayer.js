/* eslint-disable max-len */
import EventQueue from './queue';

const {
  describe,
  it,
  expect,
} = global;

// sample subscriber used for testing event broadcast
class EventSubscriber {
  constructor(id) {
    this.id = id;
    this.caughtEvents = [];
  }
  handleEvent(name, data) {
    this.caughtEvents.push([name, data]);
  }
}

// test cases
describe('EventQueue', () => {
  describe('constructor:', () => {
    it('should create a new EventQueue', () => {
      const queue = new EventQueue();

      expect(queue instanceof EventQueue).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('should properly subscribe a new subscriber', () => {
      const queue = new EventQueue();
      const subscriber = new EventSubscriber();

      queue.subscribe(subscriber);

      expect(queue.subscribers[0]).toBe(subscriber);
    });

    it('should throw an error if trying to subscribe object without handleEvent method', () => {
      const queue = new EventQueue();

      expect(() => queue.subscribe({})).toThrow();
    });

    it('should broadcast event history to a newly added subscriber when receiveHistory is true (default)', () => {
      const queue = new EventQueue();
      const subscriber = new EventSubscriber();

      queue.broadcastEvent('test', { foo: 123 });
      queue.broadcastEvent('test2', { foo: 123 });
      queue.subscribe(subscriber);

      expect(subscriber.caughtEvents.length).toEqual(2);
      expect(subscriber.caughtEvents[0]).toEqual(['test', { foo: 123 }]);
      expect(subscriber.caughtEvents[1]).toEqual(['test2', { foo: 123 }]);
    });

    it('should NOT broadcast event history to a newly added subscriber when receiveHistory is false', () => {
      const queue = new EventQueue();
      const subscriber = new EventSubscriber();

      queue.broadcastEvent('test');
      queue.subscribe(subscriber, false);

      expect(subscriber.caughtEvents.length).toEqual(0);
    });
  });

  describe('broadcast', () => {
    it('should broadcast a single event to registered subscribers', () => {
      const queue = new EventQueue();
      const subscriber = new EventSubscriber();

      queue.subscribe(subscriber);
      queue.broadcastEvent('test', { foo: 123 });

      expect(subscriber.caughtEvents.length).toEqual(1);
      expect(subscriber.caughtEvents[0]).toEqual(['test', { foo: 123 }]);
    });

    it('should NOT broadcast events to uninterested subscribers (i.e. callback returns false)', () => {
      const queue = new EventQueue();
      const subscriber = new EventSubscriber();

      queue.subscribe(subscriber);
      queue.broadcastEvent('test', { foo: 123 }, () => false);

      expect(subscriber.caughtEvents.length).toEqual(0);
    });
  });
});
