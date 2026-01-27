import logger from './logger';

export interface PerformanceMetric {
  label: string;
  duration: number;
  timestamp: number;
  metadata?: any;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private activeTimers: Map<string, number> = new Map();

  /**
   * Start a performance timer
   */
  start(label: string) {
    this.activeTimers.set(label, performance.now());
    // Also use the main logger for immediate visibility
    logger.start(label);
  }

  /**
   * End a performance timer and log the result
   */
  end(label: string, metadata?: any) {
    const startTime = this.activeTimers.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.metrics.push({
        label,
        duration,
        timestamp: Date.now(),
        metadata,
      });
      this.activeTimers.delete(label);

      // Log explicitly for the user to see "The Numbers"
      logger.info(`[PERFORMANCE] ⏱️ ${label}: ${duration.toFixed(2)}ms`, metadata || '');

      // Also call logger.end for consistency if it was tracking it
      // (Note: logger.end calculates its own duration, but that's fine)
      // logger.end(label);
    }
  }

  /**
   * Log a point-in-time metric (e.g., heap size)
   */
  measureMemory(label: string) {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      logger.info(`[PERFORMANCE] 💾 ${label} - Heap: ${usedMB} MB`);
    }
  }

  getReport() {
    return this.metrics;
  }

  clear() {
    this.metrics = [];
    this.activeTimers.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
