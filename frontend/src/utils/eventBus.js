class EventBus {
  constructor() {
    this.listeners = {};
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  }

  emit(event, ...args) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`EventBus error in handler for "${event}":`, error);
      }
    });
  }

  once(event, callback) {
    const wrapper = (...args) => {
      callback(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
}

export const eventBus = new EventBus();
export default eventBus;
