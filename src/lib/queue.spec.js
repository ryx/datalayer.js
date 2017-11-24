/* eslint-disable max-len */
import { describe, it, beforeEach } from 'mocha';
import { assert } from 'chai';
import EventQueue from './queue';

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

      assert.isTrue(queue instanceof EventQueue);
    });
  });

  describe('subscribe', () => {
    it('should properly subscribe a new subscriber', () => {
      const queue = new EventQueue();
      const subscriber = new EventSubscriber();

      queue.subscribe(subscriber);

      assert.equal(queue.subscribers[0], subscriber, 'queue should contain given subscriber');
    });

    it('should throw an error if trying to subscribe object without handleEvent method', () => {
      const queue = new EventQueue();

      assert.throws(() => queue.subscribe({}), 'subscriber has no handleEvent method');
    });

    it('should broadcast event history to a newly added subscriber when receiveHistory is true (default)', () => {
      const queue = new EventQueue();
      const subscriber = new EventSubscriber();

      queue.broadcastEvent('test', { foo: 123 });
      queue.broadcastEvent('test2', { foo: 123 });
      queue.subscribe(subscriber);

      assert.equal(subscriber.caughtEvents.length, 2, 'should have caught two events');
      assert.deepEqual(subscriber.caughtEvents[0], ['test', { foo: 123 }], 'event 1 should contain expected data');
      assert.deepEqual(subscriber.caughtEvents[1], ['test2', { foo: 123 }], 'event 2 should contain expected data');
    });

    it('should NOT broadcast event history to a newly added subscriber when receiveHistory is false', () => {
      const queue = new EventQueue();
      const subscriber = new EventSubscriber();

      queue.broadcastEvent('test');
      queue.subscribe(subscriber, false);

      assert.equal(subscriber.caughtEvents.length, 0, 'should have caught no events yet');
    });
  });

  describe('broadcast', () => {
    it('should broadcast a single event to registered subscribers', () => {
      const queue = new EventQueue();
      const subscriber = new EventSubscriber();

      queue.subscribe(subscriber);
      queue.broadcastEvent('test', { foo: 123 });

      assert.equal(subscriber.caughtEvents.length, 1, 'should have caught one event');
      assert.deepEqual(subscriber.caughtEvents[0], ['test', { foo: 123 }], 'event 1 should contain expected data');
    });

  })
});
