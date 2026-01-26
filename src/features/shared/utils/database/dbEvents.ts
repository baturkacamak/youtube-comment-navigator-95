// src/features/shared/utils/database/dbEvents.ts
/**
 * Database Event System
 *
 * Provides a pub/sub mechanism for database changes.
 * Components can subscribe to these events to reactively update UI
 * when the background worker adds new comments to IndexedDB.
 *
 * @example
 * ```ts
 * // Subscribe to specific event
 * const unsubscribe = dbEvents.on('comments:added', (event) => {
 *   console.log(`${event.count} comments added to video ${event.videoId}`);
 * });
 *
 * // Subscribe to all events
 * dbEvents.onAll((event) => {
 *   console.log(`Event: ${event.type}`, event);
 * });
 *
 * // Emit an event
 * dbEvents.emitCommentsAdded('videoId', 10, ['c1', 'c2']);
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */

import logger from '../logger';

export type DBEventType =
    | 'comments:added'
    | 'comments:updated'
    | 'comments:deleted'
    | 'comments:bulk-add'
    | 'replies:added'
    | 'livechat:added'
    | 'count:updated'
    | 'error:occurred';

export interface DBEvent {
    /** The type of database event */
    type: DBEventType;
    /** The video ID this event relates to */
    videoId: string;
    /** Optional count of affected items */
    count?: number;
    /** Optional array of affected comment IDs */
    commentIds?: string[];
    /** Timestamp when the event was created */
    timestamp: number;
    /** Optional error information for error events */
    error?: {
        message: string;
        code?: string;
        stack?: string;
    };
    /** Optional metadata for debugging */
    metadata?: Record<string, any>;
}

type DBEventHandler = (event: DBEvent) => void;

/** Statistics for monitoring event system health */
interface EventStats {
    totalEventsEmitted: number;
    eventsByType: Record<DBEventType, number>;
    totalHandlerErrors: number;
    lastEventTimestamp: number;
    averageHandlerTime: number;
}

/**
 * Database Event Emitter
 *
 * Thread-safe event emitter for database change notifications.
 * Supports typed events, wildcards, and error isolation.
 */
class DatabaseEventEmitter {
    private handlers: Map<DBEventType, Set<DBEventHandler>> = new Map();
    private allHandlers: Set<DBEventHandler> = new Set();
    private stats: EventStats = {
        totalEventsEmitted: 0,
        eventsByType: {} as Record<DBEventType, number>,
        totalHandlerErrors: 0,
        lastEventTimestamp: 0,
        averageHandlerTime: 0,
    };
    private handlerTimes: number[] = [];
    private readonly maxHandlerTimeSamples = 100;
    private debugMode = false;
    private readonly logPrefix = '[DBEvents]';

    constructor() {
        logger.debug(`${this.logPrefix} DatabaseEventEmitter initialized`);
    }

    /**
     * Enable or disable debug mode
     */
    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
        logger.info(`${this.logPrefix} Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get current debug mode status
     */
    isDebugMode(): boolean {
        return this.debugMode;
    }

    /**
     * Subscribe to a specific event type
     *
     * @param type - The event type to subscribe to
     * @param handler - The callback function to invoke
     * @returns Unsubscribe function
     */
    on(type: DBEventType, handler: DBEventHandler): () => void {
        if (!type) {
            logger.error(`${this.logPrefix} on() called with invalid type:`, type);
            throw new Error('Event type is required');
        }

        if (typeof handler !== 'function') {
            logger.error(`${this.logPrefix} on() called with non-function handler`);
            throw new Error('Handler must be a function');
        }

        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
            logger.debug(`${this.logPrefix} Created handler set for event type: ${type}`);
        }

        this.handlers.get(type)!.add(handler);

        const handlerCount = this.handlers.get(type)!.size;
        logger.debug(`${this.logPrefix} Handler registered for "${type}" (total: ${handlerCount})`);

        // Return unsubscribe function
        return () => {
            const deleted = this.handlers.get(type)?.delete(handler);
            if (deleted) {
                const remaining = this.handlers.get(type)?.size ?? 0;
                logger.debug(`${this.logPrefix} Handler unsubscribed from "${type}" (remaining: ${remaining})`);
            } else {
                logger.warn(`${this.logPrefix} Attempted to unsubscribe non-existent handler from "${type}"`);
            }
        };
    }

    /**
     * Subscribe to all database events
     *
     * @param handler - The callback function to invoke for all events
     * @returns Unsubscribe function
     */
    onAll(handler: DBEventHandler): () => void {
        if (typeof handler !== 'function') {
            logger.error(`${this.logPrefix} onAll() called with non-function handler`);
            throw new Error('Handler must be a function');
        }

        this.allHandlers.add(handler);
        logger.debug(`${this.logPrefix} Global handler registered (total: ${this.allHandlers.size})`);

        return () => {
            const deleted = this.allHandlers.delete(handler);
            if (deleted) {
                logger.debug(`${this.logPrefix} Global handler unsubscribed (remaining: ${this.allHandlers.size})`);
            } else {
                logger.warn(`${this.logPrefix} Attempted to unsubscribe non-existent global handler`);
            }
        };
    }

    /**
     * Subscribe to an event type, but only trigger once
     *
     * @param type - The event type to subscribe to
     * @param handler - The callback function to invoke once
     * @returns Unsubscribe function (in case you want to cancel before it fires)
     */
    once(type: DBEventType, handler: DBEventHandler): () => void {
        const wrappedHandler: DBEventHandler = (event) => {
            unsubscribe();
            handler(event);
        };

        const unsubscribe = this.on(type, wrappedHandler);
        logger.debug(`${this.logPrefix} One-time handler registered for "${type}"`);

        return unsubscribe;
    }

    /**
     * Emit an event to all subscribers
     *
     * @param type - The event type to emit
     * @param data - The event data (excluding type and timestamp)
     */
    emit(type: DBEventType, data: Omit<DBEvent, 'type' | 'timestamp'>): void {
        const startTime = performance.now();

        if (!type) {
            logger.error(`${this.logPrefix} emit() called with invalid type`);
            return;
        }

        if (!data.videoId) {
            logger.warn(`${this.logPrefix} emit() called without videoId for type: ${type}`);
        }

        const event: DBEvent = {
            type,
            ...data,
            timestamp: Date.now(),
        };

        // Update statistics
        this.stats.totalEventsEmitted++;
        this.stats.eventsByType[type] = (this.stats.eventsByType[type] || 0) + 1;
        this.stats.lastEventTimestamp = event.timestamp;

        if (this.debugMode) {
            logger.debug(`${this.logPrefix} Emitting event: ${type}`, {
                videoId: event.videoId,
                count: event.count,
                commentIdsCount: event.commentIds?.length,
                metadata: event.metadata,
            });
        }

        let handlersNotified = 0;
        let errorsOccurred = 0;

        // Notify specific type handlers
        const typeHandlers = this.handlers.get(type);
        if (typeHandlers && typeHandlers.size > 0) {
            typeHandlers.forEach(handler => {
                try {
                    handler(event);
                    handlersNotified++;
                } catch (error) {
                    errorsOccurred++;
                    this.stats.totalHandlerErrors++;
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorStack = error instanceof Error ? error.stack : undefined;
                    logger.error(`${this.logPrefix} Error in handler for "${type}"`, {
                        error: errorMessage,
                        stack: errorStack,
                        videoId: event.videoId,
                    });
                }
            });
        }

        // Notify all-event handlers
        if (this.allHandlers.size > 0) {
            this.allHandlers.forEach(handler => {
                try {
                    handler(event);
                    handlersNotified++;
                } catch (error) {
                    errorsOccurred++;
                    this.stats.totalHandlerErrors++;
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorStack = error instanceof Error ? error.stack : undefined;
                    logger.error(`${this.logPrefix} Error in global handler for "${type}"`, {
                        error: errorMessage,
                        stack: errorStack,
                        videoId: event.videoId,
                    });
                }
            });
        }

        // Track handler execution time
        const duration = performance.now() - startTime;
        this.handlerTimes.push(duration);
        if (this.handlerTimes.length > this.maxHandlerTimeSamples) {
            this.handlerTimes.shift();
        }
        this.stats.averageHandlerTime = this.handlerTimes.reduce((a, b) => a + b, 0) / this.handlerTimes.length;

        if (handlersNotified === 0) {
            logger.debug(`${this.logPrefix} Event "${type}" emitted but no handlers registered`);
        } else if (this.debugMode) {
            logger.debug(`${this.logPrefix} Event "${type}" delivered to ${handlersNotified} handlers in ${duration.toFixed(2)}ms`, {
                errorsOccurred,
            });
        }

        // Log warning if handlers are slow
        if (duration > 100) {
            logger.warn(`${this.logPrefix} Slow event handling detected`, {
                type,
                duration: `${duration.toFixed(2)}ms`,
                handlersNotified,
            });
        }
    }

    /**
     * Emit comments added event
     */
    emitCommentsAdded(videoId: string, count: number, commentIds?: string[]): void {
        if (!videoId) {
            logger.error(`${this.logPrefix} emitCommentsAdded called without videoId`);
            return;
        }
        if (count < 0) {
            logger.warn(`${this.logPrefix} emitCommentsAdded called with negative count: ${count}`);
        }

        logger.info(`${this.logPrefix} Comments added`, { videoId, count, commentIdsCount: commentIds?.length });
        this.emit('comments:added', { videoId, count, commentIds });
    }

    /**
     * Emit comments updated event
     */
    emitCommentsUpdated(videoId: string, count: number, commentIds?: string[]): void {
        if (!videoId) {
            logger.error(`${this.logPrefix} emitCommentsUpdated called without videoId`);
            return;
        }

        logger.info(`${this.logPrefix} Comments updated`, { videoId, count, commentIdsCount: commentIds?.length });
        this.emit('comments:updated', { videoId, count, commentIds });
    }

    /**
     * Emit comments deleted event
     */
    emitCommentsDeleted(videoId: string, count: number, commentIds?: string[]): void {
        if (!videoId) {
            logger.error(`${this.logPrefix} emitCommentsDeleted called without videoId`);
            return;
        }

        logger.info(`${this.logPrefix} Comments deleted`, { videoId, count, commentIdsCount: commentIds?.length });
        this.emit('comments:deleted', { videoId, count, commentIds });
    }

    /**
     * Emit replies added event
     */
    emitRepliesAdded(videoId: string, count: number, commentIds?: string[]): void {
        if (!videoId) {
            logger.error(`${this.logPrefix} emitRepliesAdded called without videoId`);
            return;
        }
        if (count < 0) {
            logger.warn(`${this.logPrefix} emitRepliesAdded called with negative count: ${count}`);
        }

        logger.info(`${this.logPrefix} Replies added`, { videoId, count, commentIdsCount: commentIds?.length });
        this.emit('replies:added', { videoId, count, commentIds });
    }

    /**
     * Emit bulk comments added event (for batch operations)
     */
    emitBulkCommentsAdded(videoId: string, count: number): void {
        if (!videoId) {
            logger.error(`${this.logPrefix} emitBulkCommentsAdded called without videoId`);
            return;
        }

        logger.info(`${this.logPrefix} Bulk comments added`, { videoId, count });
        this.emit('comments:bulk-add', { videoId, count });
    }

    /**
     * Emit live chat added event
     */
    emitLiveChatAdded(videoId: string, count: number): void {
        if (!videoId) {
            logger.error(`${this.logPrefix} emitLiveChatAdded called without videoId`);
            return;
        }

        logger.info(`${this.logPrefix} Live chat messages added`, { videoId, count });
        this.emit('livechat:added', { videoId, count });
    }

    /**
     * Emit count updated event
     */
    emitCountUpdated(videoId: string, count: number): void {
        if (!videoId) {
            logger.error(`${this.logPrefix} emitCountUpdated called without videoId`);
            return;
        }
        if (count < 0) {
            logger.warn(`${this.logPrefix} emitCountUpdated called with negative count: ${count}`);
        }

        logger.debug(`${this.logPrefix} Count updated`, { videoId, count });
        this.emit('count:updated', { videoId, count });
    }

    /**
     * Emit error event
     */
    emitError(videoId: string, error: Error, metadata?: Record<string, any>): void {
        logger.error(`${this.logPrefix} Error event emitted`, {
            videoId,
            error: error.message,
            stack: error.stack,
            metadata,
        });

        this.emit('error:occurred', {
            videoId,
            error: {
                message: error.message,
                code: (error as any).code,
                stack: error.stack,
            },
            metadata,
        });
    }

    /**
     * Get current handler counts
     */
    getHandlerCounts(): Record<string, number> {
        const counts: Record<string, number> = {
            global: this.allHandlers.size,
        };

        this.handlers.forEach((handlers, type) => {
            counts[type] = handlers.size;
        });

        return counts;
    }

    /**
     * Get event statistics
     */
    getStats(): EventStats {
        return { ...this.stats };
    }

    /**
     * Check if there are any handlers registered
     */
    hasHandlers(type?: DBEventType): boolean {
        if (type) {
            const typeHandlers = this.handlers.get(type);
            return (typeHandlers?.size ?? 0) > 0 || this.allHandlers.size > 0;
        }
        return this.allHandlers.size > 0 || Array.from(this.handlers.values()).some(set => set.size > 0);
    }

    /**
     * Clear all handlers (useful for cleanup/testing)
     */
    clear(): void {
        const totalHandlers = this.allHandlers.size + Array.from(this.handlers.values()).reduce((sum, set) => sum + set.size, 0);

        this.handlers.clear();
        this.allHandlers.clear();

        logger.info(`${this.logPrefix} All handlers cleared (removed: ${totalHandlers})`);
    }

    /**
     * Reset statistics (useful for testing)
     */
    resetStats(): void {
        this.stats = {
            totalEventsEmitted: 0,
            eventsByType: {} as Record<DBEventType, number>,
            totalHandlerErrors: 0,
            lastEventTimestamp: 0,
            averageHandlerTime: 0,
        };
        this.handlerTimes = [];
        logger.debug(`${this.logPrefix} Statistics reset`);
    }
}

// Singleton instance
export const dbEvents = new DatabaseEventEmitter();

export default dbEvents;
