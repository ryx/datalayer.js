/* eslint-disable class-methods-use-this */

/**
 * Synchronous event queue using the Observer Pattern. Allows easy subscription to
 * upcoming and already happened events.
 */
export default class EventQueue {
  constructor() {
    this.events = [];
    this.subscribers = [];
  }

  /**
   * Subscribe the given subscriber instance to this event queue.
   * @param {Object} subscriber object to be subscribed
   * @param {boolean} receiveHistory set to true to immediately receive the entire event history on subscription
   */
  subscribe(subscriber, receiveHistory = true) {
    if (typeof subscriber.handleEvent !== 'function') {
      throw new Error('EventQueue error: subscriber has no handleEvent method');
    }
    this.subscribers.push(subscriber);
    // fire entire event history to subscriber
    if (receiveHistory) {
      this.broadcastEventHistoryToSubscriber(subscriber);
    }
  }

  /**
   * Broadcast an event to one specific subscriber.
   * @param {Object} subscriber subscriber object to publish event to
   * @param {String} name name of event
   * @param {[any]} data optional payload object to publish together with event
   * @param {[Function]} callback optional callback that determines whether handleEvent is
   *  called for this subscriber or not
   */
  broadcastEventToSubscriber(subscriber, name, data, callback = null) {
    if (typeof callback === 'function' && callback(subscriber) === false) {
      return;
    }
    // We should catch potential errors globally
    try {
      subscriber.handleEvent(name, data);
    } catch (e) {
      throw new Error(`[${subscriber.getID()}] - could not handle event - ${name} : ${e.stack}`);
    }
  }

  /**
   * Broadcast an event to all subscribers.
   * @param {String} name name of event
   * @param {[any]} data optional payload object to publish together with event
   * @param {[Function]} callback optional callback that is called for each single subscriber and
   *  determines whether handleEvent is called for this subscriber or not
   */
  broadcastEvent(name, data, callback = null) {
    this.subscribers.forEach(subscriber => this.broadcastEventToSubscriber(subscriber, name, data, callback));
    // add event to history
    this.events.push({ name, data });
  }

  /**
   * Broadcast the entire event history to one specific subscriber.
   * @param {Object} subscriber subscriber object to publish event history to
   */
  broadcastEventHistoryToSubscriber(subscriber) {
    this.events.forEach(e => this.broadcastEventToSubscriber(subscriber, e.name, e.data));
  }
}
