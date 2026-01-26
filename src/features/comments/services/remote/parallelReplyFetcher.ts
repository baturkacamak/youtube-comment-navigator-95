/**
 * Parallel Reply Fetcher Service
 *
 * Fetches comment replies directly from content script context using p-queue
 * for concurrent requests. This approach avoids the service worker limitation
 * where requests don't get proper browser headers (Referer, sec-fetch-site, etc.),
 * which triggers YouTube's bot detection.
 *
 * Key features:
 * - Uses p-queue with concurrency of 4 (same as YCS-cont)
 * - All fetch requests happen in content script context with proper browser headers
 * - Supports pagination with continuation tokens
 * - Exponential backoff retry logic
 * - Rate limit detection and handling
 * - Abort signal support for cancellation
 * - Progress tracking with event emission
 */

import PQueue from 'p-queue';
import { processRawJsonCommentsData } from '../../utils/comments/retrieveYouTubeCommentPaths';
import { db } from '../../../shared/utils/database/database';
import { dbEvents } from '../../../shared/utils/database/dbEvents';
import logger from '../../../shared/utils/logger';

// Constants
const CONCURRENCY = 4;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2000;
const RATE_LIMIT_PAUSE_MS = 60000;
const REQUEST_TIMEOUT_MS = 30000;

export interface ReplyFetchTask {
    parentCommentId: string;
    continuationToken: string;
}

interface FetchProgress {
    completed: number;
    total: number;
    repliesFetched: number;
    failed: number;
}

interface ParsedReplyResponse {
    hasReplies: boolean;
    repliesCount: number;
    nextToken?: string;
    rawData: any;
}

/**
 * ParallelReplyFetcher - Fetches comment replies directly from content script
 *
 * This class manages concurrent reply fetching using p-queue. All requests
 * are made from the content script context, which ensures proper browser
 * headers are included automatically, avoiding YouTube's bot detection.
 */
export class ParallelReplyFetcher {
    private queue: PQueue;
    private videoId: string;
    private signal?: AbortSignal;
    private dispatch?: any;
    private progress: FetchProgress;
    private isRateLimited: boolean = false;
    private rateLimitEndTime: number = 0;

    constructor(videoId: string, signal?: AbortSignal, dispatch?: any) {
        this.videoId = videoId;
        this.signal = signal;
        this.dispatch = dispatch;
        this.progress = {
            completed: 0,
            total: 0,
            repliesFetched: 0,
            failed: 0
        };

        // Create p-queue with concurrency of 4
        this.queue = new PQueue({
            concurrency: CONCURRENCY,
            autoStart: true
        });

        logger.info(`[ParallelReplyFetcher] Initialized for video ${videoId} with concurrency ${CONCURRENCY}`);
    }

    /**
     * Queue multiple reply fetch tasks for parallel processing
     */
    async queueReplyFetches(tasks: ReplyFetchTask[]): Promise<void> {
        if (!tasks || tasks.length === 0) {
            logger.info('[ParallelReplyFetcher] No tasks to queue');
            return;
        }

        this.progress.total = tasks.length;
        logger.info(`[ParallelReplyFetcher] Queueing ${tasks.length} reply fetch tasks`);

        // Add all tasks to the queue
        const promises = tasks.map(task =>
            this.queue.add(
                () => this.fetchRepliesWithRetry(task),
                { signal: this.signal }
            ).catch(err => {
                // Handle individual task errors
                if (err.name === 'AbortError') {
                    logger.info(`[ParallelReplyFetcher] Task aborted for ${task.parentCommentId}`);
                } else {
                    logger.error(`[ParallelReplyFetcher] Task failed for ${task.parentCommentId}:`, err);
                    this.progress.failed++;
                }
            })
        );

        // Wait for all tasks to complete
        await Promise.allSettled(promises);

        logger.success(`[ParallelReplyFetcher] All tasks completed`, {
            completed: this.progress.completed,
            failed: this.progress.failed,
            repliesFetched: this.progress.repliesFetched
        });
    }

    /**
     * Wait for the queue to be empty
     */
    async waitForCompletion(): Promise<void> {
        await this.queue.onIdle();
    }

    /**
     * Get current progress
     */
    getProgress(): FetchProgress {
        return { ...this.progress };
    }

    /**
     * Clear the queue and abort pending tasks
     */
    clear(): void {
        this.queue.clear();
        logger.info('[ParallelReplyFetcher] Queue cleared');
    }

    /**
     * Fetch replies with retry logic
     */
    private async fetchRepliesWithRetry(task: ReplyFetchTask, retryCount: number = 0): Promise<void> {
        if (this.signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        // Check rate limiting
        if (this.isRateLimited) {
            const remainingTime = this.rateLimitEndTime - Date.now();
            if (remainingTime > 0) {
                logger.info(`[ParallelReplyFetcher] Rate limited, waiting ${remainingTime}ms`);
                await this.sleep(remainingTime);
            }
            this.isRateLimited = false;
        }

        try {
            await this.fetchReplies(task);
            this.progress.completed++;

            // Emit progress event
            this.emitProgress();
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw error;
            }

            const isRateLimited = this.isRateLimitError(error);
            const isRetryable = this.isRetryableError(error) && !isRateLimited;

            if (isRateLimited) {
                logger.warn(`[ParallelReplyFetcher] Rate limited, pausing for ${RATE_LIMIT_PAUSE_MS}ms`);
                this.isRateLimited = true;
                this.rateLimitEndTime = Date.now() + RATE_LIMIT_PAUSE_MS;

                // Reduce concurrency temporarily
                const currentConcurrency = this.queue.concurrency;
                this.queue.concurrency = Math.max(1, Math.floor(currentConcurrency / 2));

                await this.sleep(RATE_LIMIT_PAUSE_MS);
                this.isRateLimited = false;

                // Restore concurrency
                this.queue.concurrency = currentConcurrency;

                // Retry the task
                return this.fetchRepliesWithRetry(task, retryCount);
            }

            if (isRetryable && retryCount < MAX_RETRIES) {
                const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
                logger.warn(`[ParallelReplyFetcher] Retrying task in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                await this.sleep(delay);
                return this.fetchRepliesWithRetry(task, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Fetch replies for a single parent comment
     * Handles pagination if there are more replies
     */
    private async fetchReplies(task: ReplyFetchTask): Promise<void> {
        let continuationToken: string | undefined = task.continuationToken;
        let pageCount = 0;

        while (continuationToken) {
            if (this.signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }

            pageCount++;
            logger.debug(`[ParallelReplyFetcher] Fetching replies page ${pageCount} for ${task.parentCommentId}`);

            const result = await this.makeAuthenticatedRequest(continuationToken);

            if (result.hasReplies) {
                await this.processAndStoreReplies(task.parentCommentId, result.rawData);
                this.progress.repliesFetched += result.repliesCount;
            }

            // Continue pagination if there's a next token
            continuationToken = result.nextToken;
        }

        logger.debug(`[ParallelReplyFetcher] Completed ${pageCount} pages for ${task.parentCommentId}`);
    }

    /**
     * Make authenticated request to YouTube Innertube API
     */
    private async makeAuthenticatedRequest(continuationToken: string): Promise<ParsedReplyResponse> {
        const windowObj = window as any;
        const ytcfg = windowObj.ytcfg?.data_ || windowObj.ytcfg || {};

        // Build authorization header
        const authHeader = await this.buildAuthorizationHeader();

        // Get client context
        const clientVersion = ytcfg?.INNERTUBE_CONTEXT_CLIENT_VERSION || '2.20240620.05.00';
        const feedbackData = ytcfg?.GOOGLE_FEEDBACK_PRODUCT_DATA;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'Accept-Language': feedbackData?.accept_language || navigator.language,
        };

        // Add optional headers if available
        if (ytcfg?.VISITOR_DATA) {
            headers['x-goog-visitor-id'] = ytcfg.VISITOR_DATA;
        }
        if (ytcfg?.ID_TOKEN) {
            headers['x-youtube-identity-token'] = ytcfg.ID_TOKEN;
        }

        headers['x-youtube-client-name'] = ytcfg?.INNERTUBE_CONTEXT_CLIENT_NAME || '1';
        headers['x-youtube-client-version'] = clientVersion;

        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        // Build request body
        const clientContext = ytcfg?.INNERTUBE_CONTEXT?.client || this.getDefaultClientContext();
        const body = {
            context: {
                client: clientContext
            },
            continuation: continuationToken
        };

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        // Combine with external abort signal
        if (this.signal) {
            this.signal.addEventListener('abort', () => controller.abort());
        }

        try {
            const response = await fetch('https://www.youtube.com/youtubei/v1/next?replies=true', {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                credentials: 'include',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status === 429) {
                throw new Error('RATE_LIMITED');
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return this.parseReplyResponse(data);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Parse YouTube API response for replies
     */
    private parseReplyResponse(data: any): ParsedReplyResponse {
        let nextToken: string | undefined;
        let repliesCount = 0;

        try {
            // Extract continuation items from various response paths
            const continuationItems =
                data.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
                data.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems ||
                [];

            // Count mutations (comment data in new format)
            const mutations = data.frameworkUpdates?.entityBatchUpdate?.mutations || [];
            for (const mutation of mutations) {
                if (mutation?.payload?.commentEntityPayload) {
                    repliesCount++;
                }
            }

            // Find next continuation token
            for (const item of continuationItems) {
                const token = item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
                if (token && typeof token === 'string') {
                    nextToken = token;
                    break;
                }
            }
        } catch (error) {
            logger.warn('[ParallelReplyFetcher] Error parsing reply response', error);
        }

        return {
            hasReplies: repliesCount > 0,
            repliesCount,
            nextToken,
            rawData: data
        };
    }

    /**
     * Process raw reply data and store in IndexedDB
     */
    private async processAndStoreReplies(parentCommentId: string, rawData: any): Promise<number> {
        try {
            // Process raw reply data using the standard transformation
            const processedData = processRawJsonCommentsData([rawData], this.videoId);

            if (processedData.items.length === 0) {
                return 0;
            }

            // Ensure all items have the correct parent reference and reply level
            const repliesWithParent = processedData.items.map((item: any) => ({
                ...item,
                commentParentId: item.commentParentId || parentCommentId,
                replyLevel: item.replyLevel ?? 1
            }));

            // Upsert replies into database
            await db.transaction('rw', db.comments, async () => {
                const incomingIds = repliesWithParent.map((c: any) => c.commentId).filter(Boolean);
                if (incomingIds.length === 0) return;

                const existingRecords = await db.comments
                    .where('commentId')
                    .anyOf(incomingIds)
                    .toArray();

                const idMap = new Map(existingRecords.map(c => [c.commentId, c.id]));

                const commentsToSave = repliesWithParent.map((c: any) => {
                    if (idMap.has(c.commentId)) {
                        return { ...c, id: idMap.get(c.commentId) };
                    }
                    const { id, ...rest } = c;
                    return rest;
                });

                await db.comments.bulkPut(commentsToSave);
            });

            // Emit database event for reactive UI updates
            if (repliesWithParent.length > 0) {
                const replyIds = repliesWithParent.map((c: any) => c.commentId).filter(Boolean);
                dbEvents.emitRepliesAdded(this.videoId, repliesWithParent.length, replyIds);

                // Get updated total count and emit
                const totalCount = await db.comments.where('videoId').equals(this.videoId).count();
                dbEvents.emitCountUpdated(this.videoId, totalCount);
            }

            return repliesWithParent.length;
        } catch (error) {
            logger.error('[ParallelReplyFetcher] Failed to process and store reply data:', error);
            throw error;
        }
    }

    /**
     * Build authorization header with SAPISIDHASH
     */
    private async buildAuthorizationHeader(): Promise<string | undefined> {
        const origin = window.location.origin || 'https://www.youtube.com';
        const timestamp = Math.floor(Date.now() / 1000);
        const tokens: string[] = [];

        const sapSid = this.readCookie(['__SAPISID', 'SAPISID', '__Secure-3PAPISID']);
        if (sapSid) {
            const token = await this.buildSapSidToken('SAPISIDHASH', sapSid, origin, timestamp);
            if (token) tokens.push(token);
        }

        const onePSid = this.readCookie(['__1PSAPISID', '__Secure-1PAPISID']);
        if (onePSid) {
            const token = await this.buildSapSidToken('SAPISID1PHASH', onePSid, origin, timestamp);
            if (token) tokens.push(token);
        }

        const threePSid = this.readCookie(['__3PSAPISID', '__Secure-3PAPISID']);
        if (threePSid) {
            const token = await this.buildSapSidToken('SAPISID3PHASH', threePSid, origin, timestamp);
            if (token) tokens.push(token);
        }

        return tokens.length ? tokens.join(' ') : undefined;
    }

    /**
     * Read cookie by name(s)
     */
    private readCookie(names: string[]): string | undefined {
        try {
            const cookies = document.cookie.split(';');
            for (const name of names) {
                for (const cookie of cookies) {
                    const trimmed = cookie.trim();
                    if (trimmed.startsWith(`${name}=`)) {
                        return trimmed.substring(name.length + 1);
                    }
                }
            }
            return undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Build SAPISIDHASH token
     */
    private async buildSapSidToken(
        headerName: string,
        secret: string,
        origin: string,
        timestamp: number
    ): Promise<string | undefined> {
        if (!secret) return undefined;

        try {
            const data = new TextEncoder().encode(`${timestamp} ${secret} ${origin}`);
            const buffer = await crypto.subtle.digest('SHA-1', data);
            const digest = Array.from(new Uint8Array(buffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            return `${headerName} ${timestamp}_${digest}`;
        } catch {
            return undefined;
        }
    }

    /**
     * Get default client context
     */
    private getDefaultClientContext(): any {
        return {
            deviceMake: '',
            deviceModel: '',
            userAgent: navigator.userAgent,
            clientName: 'WEB',
            clientVersion: '2.20240620.05.00',
            osName: navigator.platform,
            osVersion: '',
            originalUrl: window.location.href,
            platform: 'DESKTOP',
            clientFormFactor: 'UNKNOWN_FORM_FACTOR',
            screenDensityFloat: window.devicePixelRatio,
            userInterfaceTheme: 'USER_INTERFACE_THEME_DARK',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            browserVersion: '2.20240620.05.00',
            screenWidthPoints: window.innerWidth,
            screenHeightPoints: window.innerHeight,
            utcOffsetMinutes: new Date().getTimezoneOffset() * -1,
            clientScreen: 'WATCH'
        };
    }

    /**
     * Emit progress event
     */
    private emitProgress(): void {
        // Emit a custom progress event if needed
        // For now, we rely on dbEvents for UI updates
        logger.debug('[ParallelReplyFetcher] Progress:', this.progress);
    }

    /**
     * Check if error is a rate limit error
     */
    private isRateLimitError(error: any): boolean {
        if (error instanceof Error) {
            return error.message === 'RATE_LIMITED' || error.message.includes('429');
        }
        return false;
    }

    /**
     * Check if error is retryable
     */
    private isRetryableError(error: any): boolean {
        if (error instanceof Error) {
            // Retry on network errors and server errors
            return error.message.includes('NETWORK') ||
                   error.message.includes('5') || // 5xx errors
                   error.message.includes('TIMEOUT') ||
                   error.name === 'TypeError'; // Network failure
        }
        return true;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Create and use a parallel reply fetcher for a video
 * Convenience function for one-shot fetching
 */
export async function fetchRepliesInParallel(
    videoId: string,
    tasks: ReplyFetchTask[],
    signal?: AbortSignal,
    dispatch?: any
): Promise<FetchProgress> {
    const fetcher = new ParallelReplyFetcher(videoId, signal, dispatch);
    await fetcher.queueReplyFetches(tasks);
    await fetcher.waitForCompletion();
    return fetcher.getProgress();
}
