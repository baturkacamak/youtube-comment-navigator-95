export type DevLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface DevLogEntry {
  id: string;
  timestamp: string;
  level: DevLogLevel;
  scope: string;
  message: string;
  data?: unknown;
}

type Subscriber = (entries: DevLogEntry[]) => void;

const STORAGE_KEY = 'ycn-devtools-log-entries';

const loadPersistedEntries = (): DevLogEntry[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is DevLogEntry =>
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.timestamp === 'string' &&
        typeof entry.level === 'string' &&
        typeof entry.scope === 'string' &&
        typeof entry.message === 'string'
    );
  } catch {
    return [];
  }
};

class DevToolsStore {
  private entries: DevLogEntry[] = loadPersistedEntries();
  private subscribers = new Set<Subscriber>();
  private maxEntries = 1000;

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    callback(this.getEntries());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  add(entry: Omit<DevLogEntry, 'id' | 'timestamp'>) {
    const next: DevLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    this.entries = [...this.entries, next].slice(-this.maxEntries);
    this.persist();
    this.notify();
  }

  clear() {
    this.entries = [];
    this.persist();
    this.notify();
  }

  getEntries(): DevLogEntry[] {
    return [...this.entries];
  }

  private notify() {
    const snapshot = this.getEntries();
    this.subscribers.forEach((callback) => callback(snapshot));
  }

  private persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // Ignore persistence failures. In-memory logs still work.
    }
  }
}

export const devToolsStore = new DevToolsStore();
