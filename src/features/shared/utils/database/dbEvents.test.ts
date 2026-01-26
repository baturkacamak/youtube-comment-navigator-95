// src/features/shared/utils/database/dbEvents.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dbEvents, DBEvent, DBEventType } from './dbEvents';

// Mock the logger module
vi.mock('../logger', () => ({
    default: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        start: vi.fn(),
        end: vi.fn(),
    }
}));

describe('DatabaseEventEmitter', () => {
    beforeEach(() => {
        dbEvents.clear();
        dbEvents.resetStats();
        vi.clearAllMocks();
    });

    afterEach(() => {
        dbEvents.clear();
    });

    describe('on()', () => {
        it('should subscribe to a specific event type', () => {
            const handler = vi.fn();
            dbEvents.on('comments:added', handler);

            dbEvents.emit('comments:added', { videoId: 'v1', count: 5 });

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'comments:added',
                    videoId: 'v1',
                    count: 5,
                })
            );
        });

        it('should not call handler for different event types', () => {
            const handler = vi.fn();
            dbEvents.on('comments:added', handler);

            dbEvents.emit('replies:added', { videoId: 'v1', count: 3 });

            expect(handler).not.toHaveBeenCalled();
        });

        it('should return an unsubscribe function', () => {
            const handler = vi.fn();
            const unsubscribe = dbEvents.on('comments:added', handler);

            dbEvents.emit('comments:added', { videoId: 'v1' });
            expect(handler).toHaveBeenCalledTimes(1);

            unsubscribe();

            dbEvents.emit('comments:added', { videoId: 'v1' });
            expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
        });

        it('should support multiple handlers for the same event', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            dbEvents.on('comments:added', handler1);
            dbEvents.on('comments:added', handler2);

            dbEvents.emit('comments:added', { videoId: 'v1', count: 10 });

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it('should throw error for invalid event type', () => {
            expect(() => {
                dbEvents.on('' as DBEventType, vi.fn());
            }).toThrow('Event type is required');
        });

        it('should throw error for non-function handler', () => {
            expect(() => {
                dbEvents.on('comments:added', 'not a function' as any);
            }).toThrow('Handler must be a function');
        });

        it('should handle rapid subscribe/unsubscribe cycles', () => {
            const handler = vi.fn();

            for (let i = 0; i < 100; i++) {
                const unsubscribe = dbEvents.on('comments:added', handler);
                unsubscribe();
            }

            dbEvents.emit('comments:added', { videoId: 'v1' });
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('onAll()', () => {
        it('should subscribe to all event types', () => {
            const handler = vi.fn();
            dbEvents.onAll(handler);

            dbEvents.emit('comments:added', { videoId: 'v1', count: 5 });
            dbEvents.emit('replies:added', { videoId: 'v1', count: 3 });
            dbEvents.emit('count:updated', { videoId: 'v1', count: 100 });

            expect(handler).toHaveBeenCalledTimes(3);
        });

        it('should return an unsubscribe function', () => {
            const handler = vi.fn();
            const unsubscribe = dbEvents.onAll(handler);

            dbEvents.emit('comments:added', { videoId: 'v1' });
            expect(handler).toHaveBeenCalledTimes(1);

            unsubscribe();

            dbEvents.emit('comments:added', { videoId: 'v1' });
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should throw error for non-function handler', () => {
            expect(() => {
                dbEvents.onAll(null as any);
            }).toThrow('Handler must be a function');
        });

        it('should receive events from all types', () => {
            const receivedTypes: DBEventType[] = [];
            dbEvents.onAll((event) => {
                receivedTypes.push(event.type);
            });

            dbEvents.emit('comments:added', { videoId: 'v1' });
            dbEvents.emit('comments:updated', { videoId: 'v1' });
            dbEvents.emit('comments:deleted', { videoId: 'v1' });
            dbEvents.emit('replies:added', { videoId: 'v1' });
            dbEvents.emit('livechat:added', { videoId: 'v1' });
            dbEvents.emit('count:updated', { videoId: 'v1' });

            expect(receivedTypes).toEqual([
                'comments:added',
                'comments:updated',
                'comments:deleted',
                'replies:added',
                'livechat:added',
                'count:updated',
            ]);
        });
    });

    describe('once()', () => {
        it('should only trigger handler once', () => {
            const handler = vi.fn();
            dbEvents.once('comments:added', handler);

            dbEvents.emit('comments:added', { videoId: 'v1' });
            dbEvents.emit('comments:added', { videoId: 'v1' });
            dbEvents.emit('comments:added', { videoId: 'v1' });

            expect(handler).toHaveBeenCalledTimes(1);
        });

        it('should be cancellable before triggering', () => {
            const handler = vi.fn();
            const unsubscribe = dbEvents.once('comments:added', handler);

            unsubscribe();

            dbEvents.emit('comments:added', { videoId: 'v1' });
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('emit()', () => {
        it('should include timestamp in emitted events', () => {
            const handler = vi.fn();
            const beforeTime = Date.now();

            dbEvents.on('comments:added', handler);
            dbEvents.emit('comments:added', { videoId: 'v1' });

            const afterTime = Date.now();
            const event = handler.mock.calls[0][0] as DBEvent;

            expect(event.timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(event.timestamp).toBeLessThanOrEqual(afterTime);
        });

        it('should include optional commentIds array', () => {
            const handler = vi.fn();
            const commentIds = ['c1', 'c2', 'c3'];

            dbEvents.on('comments:added', handler);
            dbEvents.emit('comments:added', { videoId: 'v1', commentIds });

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({ commentIds })
            );
        });

        it('should include optional metadata', () => {
            const handler = vi.fn();
            const metadata = { source: 'test', batchId: 123 };

            dbEvents.on('comments:added', handler);
            dbEvents.emit('comments:added', { videoId: 'v1', metadata });

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({ metadata })
            );
        });

        it('should catch and log errors in handlers without stopping other handlers', () => {
            const errorHandler = vi.fn(() => {
                throw new Error('Handler error');
            });
            const normalHandler = vi.fn();

            dbEvents.on('comments:added', errorHandler);
            dbEvents.on('comments:added', normalHandler);

            dbEvents.emit('comments:added', { videoId: 'v1' });

            expect(errorHandler).toHaveBeenCalledTimes(1);
            expect(normalHandler).toHaveBeenCalledTimes(1);
        });

        it('should handle empty videoId gracefully', () => {
            const handler = vi.fn();
            dbEvents.on('comments:added', handler);

            // Should not throw
            dbEvents.emit('comments:added', { videoId: '' });
            expect(handler).toHaveBeenCalled();
        });

        it('should update statistics on emit', () => {
            dbEvents.emit('comments:added', { videoId: 'v1', count: 5 });
            dbEvents.emit('comments:added', { videoId: 'v1', count: 3 });
            dbEvents.emit('replies:added', { videoId: 'v1', count: 2 });

            const stats = dbEvents.getStats();

            expect(stats.totalEventsEmitted).toBe(3);
            expect(stats.eventsByType['comments:added']).toBe(2);
            expect(stats.eventsByType['replies:added']).toBe(1);
            expect(stats.lastEventTimestamp).toBeGreaterThan(0);
        });
    });

    describe('convenience methods', () => {
        describe('emitCommentsAdded()', () => {
            it('should emit comments:added event', () => {
                const handler = vi.fn();
                dbEvents.on('comments:added', handler);

                dbEvents.emitCommentsAdded('v1', 10, ['c1', 'c2']);

                expect(handler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'comments:added',
                        videoId: 'v1',
                        count: 10,
                        commentIds: ['c1', 'c2'],
                    })
                );
            });

            it('should handle missing videoId', () => {
                const handler = vi.fn();
                dbEvents.on('comments:added', handler);

                dbEvents.emitCommentsAdded('', 10);

                expect(handler).not.toHaveBeenCalled();
            });

            it('should handle negative count with warning', () => {
                const handler = vi.fn();
                dbEvents.on('comments:added', handler);

                dbEvents.emitCommentsAdded('v1', -5);

                expect(handler).toHaveBeenCalled();
            });
        });

        describe('emitCommentsUpdated()', () => {
            it('should emit comments:updated event', () => {
                const handler = vi.fn();
                dbEvents.on('comments:updated', handler);

                dbEvents.emitCommentsUpdated('v1', 5, ['c1']);

                expect(handler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'comments:updated',
                        videoId: 'v1',
                        count: 5,
                    })
                );
            });
        });

        describe('emitCommentsDeleted()', () => {
            it('should emit comments:deleted event', () => {
                const handler = vi.fn();
                dbEvents.on('comments:deleted', handler);

                dbEvents.emitCommentsDeleted('v1', 3, ['c1', 'c2', 'c3']);

                expect(handler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'comments:deleted',
                        videoId: 'v1',
                        count: 3,
                        commentIds: ['c1', 'c2', 'c3'],
                    })
                );
            });
        });

        describe('emitRepliesAdded()', () => {
            it('should emit replies:added event', () => {
                const handler = vi.fn();
                dbEvents.on('replies:added', handler);

                dbEvents.emitRepliesAdded('v1', 5, ['r1', 'r2']);

                expect(handler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'replies:added',
                        videoId: 'v1',
                        count: 5,
                        commentIds: ['r1', 'r2'],
                    })
                );
            });

            it('should handle missing videoId', () => {
                const handler = vi.fn();
                dbEvents.on('replies:added', handler);

                dbEvents.emitRepliesAdded('', 5);

                expect(handler).not.toHaveBeenCalled();
            });
        });

        describe('emitBulkCommentsAdded()', () => {
            it('should emit comments:bulk-add event', () => {
                const handler = vi.fn();
                dbEvents.on('comments:bulk-add', handler);

                dbEvents.emitBulkCommentsAdded('v1', 100);

                expect(handler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'comments:bulk-add',
                        videoId: 'v1',
                        count: 100,
                    })
                );
            });
        });

        describe('emitLiveChatAdded()', () => {
            it('should emit livechat:added event', () => {
                const handler = vi.fn();
                dbEvents.on('livechat:added', handler);

                dbEvents.emitLiveChatAdded('v1', 50);

                expect(handler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'livechat:added',
                        videoId: 'v1',
                        count: 50,
                    })
                );
            });
        });

        describe('emitCountUpdated()', () => {
            it('should emit count:updated event', () => {
                const handler = vi.fn();
                dbEvents.on('count:updated', handler);

                dbEvents.emitCountUpdated('v1', 500);

                expect(handler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'count:updated',
                        videoId: 'v1',
                        count: 500,
                    })
                );
            });

            it('should handle missing videoId', () => {
                const handler = vi.fn();
                dbEvents.on('count:updated', handler);

                dbEvents.emitCountUpdated('', 500);

                expect(handler).not.toHaveBeenCalled();
            });
        });

        describe('emitError()', () => {
            it('should emit error:occurred event', () => {
                const handler = vi.fn();
                dbEvents.on('error:occurred', handler);

                const error = new Error('Test error');
                dbEvents.emitError('v1', error, { context: 'test' });

                expect(handler).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'error:occurred',
                        videoId: 'v1',
                        error: expect.objectContaining({
                            message: 'Test error',
                        }),
                        metadata: { context: 'test' },
                    })
                );
            });

            it('should include error stack', () => {
                const handler = vi.fn();
                dbEvents.on('error:occurred', handler);

                const error = new Error('Test error');
                dbEvents.emitError('v1', error);

                const event = handler.mock.calls[0][0] as DBEvent;
                expect(event.error?.stack).toBeDefined();
            });
        });
    });

    describe('getHandlerCounts()', () => {
        it('should return correct handler counts', () => {
            dbEvents.on('comments:added', vi.fn());
            dbEvents.on('comments:added', vi.fn());
            dbEvents.on('replies:added', vi.fn());
            dbEvents.onAll(vi.fn());

            const counts = dbEvents.getHandlerCounts();

            expect(counts['comments:added']).toBe(2);
            expect(counts['replies:added']).toBe(1);
            expect(counts.global).toBe(1);
        });

        it('should return empty counts when no handlers', () => {
            const counts = dbEvents.getHandlerCounts();

            expect(counts.global).toBe(0);
        });
    });

    describe('getStats()', () => {
        it('should return accurate statistics', () => {
            dbEvents.emit('comments:added', { videoId: 'v1', count: 5 });
            dbEvents.emit('comments:added', { videoId: 'v1', count: 3 });

            const stats = dbEvents.getStats();

            expect(stats.totalEventsEmitted).toBe(2);
            expect(stats.eventsByType['comments:added']).toBe(2);
        });

        it('should track handler errors', () => {
            dbEvents.on('comments:added', () => {
                throw new Error('Test error');
            });

            dbEvents.emit('comments:added', { videoId: 'v1' });

            const stats = dbEvents.getStats();
            expect(stats.totalHandlerErrors).toBe(1);
        });

        it('should return a copy of stats (immutable)', () => {
            const stats1 = dbEvents.getStats();
            stats1.totalEventsEmitted = 999;

            const stats2 = dbEvents.getStats();
            expect(stats2.totalEventsEmitted).toBe(0);
        });
    });

    describe('hasHandlers()', () => {
        it('should return true when handlers exist for type', () => {
            dbEvents.on('comments:added', vi.fn());

            expect(dbEvents.hasHandlers('comments:added')).toBe(true);
            expect(dbEvents.hasHandlers('replies:added')).toBe(false);
        });

        it('should return true when global handlers exist', () => {
            dbEvents.onAll(vi.fn());

            expect(dbEvents.hasHandlers('comments:added')).toBe(true);
            expect(dbEvents.hasHandlers()).toBe(true);
        });

        it('should return false when no handlers exist', () => {
            expect(dbEvents.hasHandlers()).toBe(false);
            expect(dbEvents.hasHandlers('comments:added')).toBe(false);
        });
    });

    describe('clear()', () => {
        it('should remove all handlers', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            dbEvents.on('comments:added', handler1);
            dbEvents.onAll(handler2);

            dbEvents.clear();

            dbEvents.emit('comments:added', { videoId: 'v1' });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });

        it('should allow new subscriptions after clear', () => {
            dbEvents.on('comments:added', vi.fn());
            dbEvents.clear();

            const newHandler = vi.fn();
            dbEvents.on('comments:added', newHandler);

            dbEvents.emit('comments:added', { videoId: 'v1' });
            expect(newHandler).toHaveBeenCalled();
        });
    });

    describe('resetStats()', () => {
        it('should reset all statistics', () => {
            dbEvents.emit('comments:added', { videoId: 'v1' });
            dbEvents.emit('comments:added', { videoId: 'v1' });

            dbEvents.resetStats();

            const stats = dbEvents.getStats();
            expect(stats.totalEventsEmitted).toBe(0);
            expect(stats.totalHandlerErrors).toBe(0);
            expect(stats.lastEventTimestamp).toBe(0);
        });
    });

    describe('debug mode', () => {
        it('should toggle debug mode', () => {
            expect(dbEvents.isDebugMode()).toBe(false);

            dbEvents.setDebugMode(true);
            expect(dbEvents.isDebugMode()).toBe(true);

            dbEvents.setDebugMode(false);
            expect(dbEvents.isDebugMode()).toBe(false);
        });
    });

    describe('concurrent operations', () => {
        it('should handle many concurrent emits', async () => {
            const handler = vi.fn();
            dbEvents.on('comments:added', handler);

            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(
                    Promise.resolve().then(() => {
                        dbEvents.emit('comments:added', { videoId: 'v1', count: i });
                    })
                );
            }

            await Promise.all(promises);

            expect(handler).toHaveBeenCalledTimes(100);
        });

        it('should handle subscribe during emit', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            dbEvents.on('comments:added', () => {
                handler1();
                dbEvents.on('comments:added', handler2);
            });

            dbEvents.emit('comments:added', { videoId: 'v1' });

            expect(handler1).toHaveBeenCalledTimes(1);
            // handler2 should not be called for this emit (added after iteration started)
            // The exact behavior depends on Set iteration guarantees

            dbEvents.emit('comments:added', { videoId: 'v1' });
            expect(handler2).toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle large commentIds arrays', () => {
            const handler = vi.fn();
            dbEvents.on('comments:added', handler);

            const largeCommentIds = Array.from({ length: 10000 }, (_, i) => `c${i}`);
            dbEvents.emitCommentsAdded('v1', 10000, largeCommentIds);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    commentIds: largeCommentIds,
                })
            );
        });

        it('should handle special characters in videoId', () => {
            const handler = vi.fn();
            dbEvents.on('comments:added', handler);

            const specialVideoId = 'v1-_abc123';
            dbEvents.emitCommentsAdded(specialVideoId, 5);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    videoId: specialVideoId,
                })
            );
        });

        it('should handle zero count', () => {
            const handler = vi.fn();
            dbEvents.on('comments:added', handler);

            dbEvents.emitCommentsAdded('v1', 0);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    count: 0,
                })
            );
        });
    });
});
