// src/features/shared/utils/database/dbEvents.ts
/**
 * Database Event System
 *
 * Provides a pub/sub mechanism for database changes.
 * Components can subscribe to these events to reactively update UI
 * when the background worker adds new comments to IndexedDB.
 */

export type DBEventType =
    | 'comments:added'
    | 'comments:updated'
    | 'comments:deleted'
    | 'comments:bulk-add'
    | 'replies:added'
    | 'livechat:added'
    | 'count:updated';

export interface DBEvent {
    type: DBEventType;
    videoId: string;
    count?: number;
    commentIds?: string[];
    timestamp: number;
}

type DBEventHandler = (event: DBEvent) => void;

class DatabaseEventEmitter {
    private handlers: Map<DBEventType, Set<DBEventHandler>> = new Map();
    private allHandlers: Set<DBEventHandler> = new Set();

    /**
     * Subscribe to a specific event type
     */
    on(type: DBEventType, handler: DBEventHandler): () => void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.handlers.get(type)?.delete(handler);
        };
    }

    /**
     * Subscribe to all database events
     */
    onAll(handler: DBEventHandler): () => void {
        this.allHandlers.add(handler);
        return () => {
            this.allHandlers.delete(handler);
        };
    }

    /**
     * Emit an event to all subscribers
     */
    emit(type: DBEventType, data: Omit<DBEvent, 'type' | 'timestamp'>): void {
        const event: DBEvent = {
            type,
            ...data,
            timestamp: Date.now(),
        };

        // Notify specific type handlers
        const typeHandlers = this.handlers.get(type);
        if (typeHandlers) {
            typeHandlers.forEach(handler => {
                try {
                    handler(event);
                } catch (error) {
                    console.error(`[DBEvents] Error in handler for ${type}:`, error);
                }
            });
        }

        // Notify all-event handlers
        this.allHandlers.forEach(handler => {
            try {
                handler(event);
            } catch (error) {
                console.error(`[DBEvents] Error in global handler:`, error);
            }
        });
    }

    /**
     * Emit comments added event
     */
    emitCommentsAdded(videoId: string, count: number, commentIds?: string[]): void {
        this.emit('comments:added', { videoId, count, commentIds });
    }

    /**
     * Emit replies added event
     */
    emitRepliesAdded(videoId: string, count: number, commentIds?: string[]): void {
        this.emit('replies:added', { videoId, count, commentIds });
    }

    /**
     * Emit bulk comments added event (for batch operations)
     */
    emitBulkCommentsAdded(videoId: string, count: number): void {
        this.emit('comments:bulk-add', { videoId, count });
    }

    /**
     * Emit count updated event
     */
    emitCountUpdated(videoId: string, count: number): void {
        this.emit('count:updated', { videoId, count });
    }

    /**
     * Clear all handlers (useful for cleanup/testing)
     */
    clear(): void {
        this.handlers.clear();
        this.allHandlers.clear();
    }
}

// Singleton instance
export const dbEvents = new DatabaseEventEmitter();

export default dbEvents;
