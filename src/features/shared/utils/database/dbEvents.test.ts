// src/features/shared/utils/database/dbEvents.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbEvents, DBEvent, DBEventType } from './dbEvents';

describe('DatabaseEventEmitter', () => {
    beforeEach(() => {
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

        it('should catch and log errors in handlers without stopping other handlers', () => {
            const errorHandler = vi.fn(() => {
                throw new Error('Handler error');
            });
            const normalHandler = vi.fn();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            dbEvents.on('comments:added', errorHandler);
            dbEvents.on('comments:added', normalHandler);

            dbEvents.emit('comments:added', { videoId: 'v1' });

            expect(errorHandler).toHaveBeenCalledTimes(1);
            expect(normalHandler).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('convenience methods', () => {
        it('emitCommentsAdded() should emit comments:added event', () => {
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

        it('emitRepliesAdded() should emit replies:added event', () => {
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

        it('emitBulkCommentsAdded() should emit comments:bulk-add event', () => {
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

        it('emitCountUpdated() should emit count:updated event', () => {
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
    });
});
