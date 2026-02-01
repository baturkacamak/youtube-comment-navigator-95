// src/features/shared/utils/eventEmitter.ts
type EventCallback<T = any> = (data: T) => void;

export const eventEmitter = {
  events: { /* no-op */ } as Record<string, EventCallback<any>[]>,

  on<T>(event: string, callback: EventCallback<T>) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback as EventCallback<any>);
    return () => this.off(event, callback);
  },

  off<T>(event: string, callback: EventCallback<T>) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    }
  },

  emit<T>(event: string, data: T) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(data));
    }
  },
};
