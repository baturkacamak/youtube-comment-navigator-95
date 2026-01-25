import { Comment } from "../../../../types/commentTypes";
import { LiveChatMessage, LiveChatBadge, LiveChatError, LiveChatErrorType } from "../../../../types/liveChatTypes";
import { ensureTextMessageRenderer, formatChatRuns, markTimelineLinks, prepareChatCommentFields } from './utils';
import { wrapTryCatch } from './common';
import logger from '../../../shared/utils/logger';

export interface ChatProcessingContext {
    currentVideoId?: string;
    broadcastStartTime?: string;
}

export interface ProcessedLiveChatData {
    messages: LiveChatMessage[];
    replies: Comment[]; // Chat replies stored as comments
    errors: LiveChatError[];
}

/**
 * Process live chat actions from YouTube API
 * Separates main messages from replies and provides extensive error handling
 * @param actions Raw actions from YouTube API
 * @param context Processing context with video ID
 * @returns Processed messages, replies, and errors
 */
export function processLiveChatActions(actions: any[], context: ChatProcessingContext): ProcessedLiveChatData {
    const messages: LiveChatMessage[] = [];
    const replies: Comment[] = [];
    const errors: LiveChatError[] = [];

    if (!Array.isArray(actions) || actions.length === 0) {
        logger.warn('[LiveChatProcessor] No actions to process');
        return { messages, replies, errors };
    }

    logger.info(`[LiveChatProcessor] Processing ${actions.length} livechat actions`);

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];

        try {
            // Normalize structure to be similar to replay actions if needed, or handle both
            // Live chat actions usually have `addChatItemAction` directly or wrapped

            // We construct a wrapper similar to YCS-cont to reuse their utils
            const commentWrapper = {
                replayChatItemAction: {
                    actions: [action]
                }
            };

            // Ensure it's a text message renderer
            try {
                ensureTextMessageRenderer(commentWrapper);
            } catch (error: any) {
                // Not a text message (could be paid message, membership, etc.)
                // Log and continue
                logger.debug(`[LiveChatProcessor] Action ${i} is not a text message, skipping`);
                continue;
            }

            // Extract timestamp
            const timestampUsec = wrapTryCatch(
                () =>
                    commentWrapper.replayChatItemAction.actions[0].addChatItemAction.item.liveChatTextMessageRenderer
                        .timestampUsec
            ) as string | undefined;

            if (!timestampUsec) {
                errors.push({
                    type: LiveChatErrorType.PARSE_ERROR,
                    message: `Action ${i} missing timestampUsec`,
                    timestamp: Date.now(),
                    context: { actionIndex: i }
                });
                continue;
            }

            const timestampMicroseconds = Number.parseInt(String(timestampUsec), 10);
            if (!timestampMicroseconds || Number.isNaN(timestampMicroseconds)) {
                errors.push({
                    type: LiveChatErrorType.PARSE_ERROR,
                    message: `Action ${i} has invalid timestamp: ${timestampUsec}`,
                    timestamp: Date.now(),
                    context: { actionIndex: i, timestampUsec }
                });
                continue;
            }

            const timestampMs = timestampMicroseconds / 1000;

            // Extract renderer
            const renderer = wrapTryCatch(
                () => commentWrapper.replayChatItemAction.actions[0].addChatItemAction.item.liveChatTextMessageRenderer
            );

            if (!renderer) {
                errors.push({
                    type: LiveChatErrorType.PARSE_ERROR,
                    message: `Action ${i} missing renderer`,
                    timestamp: Date.now(),
                    context: { actionIndex: i }
                });
                continue;
            }

            // Format message content
            renderer.message = renderer.message || {};
            const runs = (wrapTryCatch(() => renderer.message.runs) as any[]) || [];
            const formatted = formatChatRuns(runs, { currentVideoId: context.currentVideoId });

            if (formatted.fullText) {
                renderer.message.fullText = formatted.fullText;
                renderer.message.renderFullText = formatted.richText;
            }

            markTimelineLinks(commentWrapper, formatted.hasTimelineLink);

            const hasAuthor = wrapTryCatch(() => renderer.authorName);
            // Some system messages don't have author, we might want to skip them or handle them
            if (!hasAuthor && !renderer.message.fullText) {
                logger.debug(`[LiveChatProcessor] Action ${i} has no author or message, skipping`);
                continue;
            }

            // Extract author information
            const authorName = renderer.authorName?.simpleText || 'Unknown';
            const authorPhoto = renderer.authorPhoto?.thumbnails?.[0]?.url || '';
            const authorChannelId = renderer.authorExternalChannelId || '';
            const messageId = renderer.id || `chat-${timestampMs}-${Math.random().toString(36).substring(7)}`;

            // Extract badges
            const badges: LiveChatBadge[] = [];
            let isAuthorContentCreator = false;
            let isModerator = false;
            let isVerified = false;
            let isMembership = false;

            if (renderer.authorBadges) {
                for (const badge of renderer.authorBadges) {
                    const badgeRenderer = badge.liveChatAuthorBadgeRenderer;
                    if (!badgeRenderer) continue;

                    const tooltip = badgeRenderer.tooltip || '';
                    const iconUrl = badgeRenderer.customThumbnail?.thumbnails?.[0]?.url || '';
                    const iconType = badgeRenderer.icon?.iconType;

                    // Check for specific badge types
                    if (iconType === 'OWNER' || tooltip.toLowerCase().includes('owner')) {
                        isAuthorContentCreator = true;
                    }
                    if (iconType === 'MODERATOR' || tooltip.toLowerCase().includes('moderator')) {
                        isModerator = true;
                    }
                    if (iconType === 'VERIFIED' || tooltip.toLowerCase().includes('verified')) {
                        isVerified = true;
                    }
                    if (tooltip.toLowerCase().includes('member')) {
                        isMembership = true;
                    }

                    badges.push({
                        label: tooltip,
                        iconUrl: iconUrl,
                        tooltipText: tooltip
                    });
                }
            }

            // Extract video offset time if available
            const videoOffsetTimeSec = wrapTryCatch(() =>
                commentWrapper.replayChatItemAction.actions[0].videoOffsetTimeMsec
            ) as number | undefined;
            const videoOffsetTimeSeconds = videoOffsetTimeSec ? videoOffsetTimeSec / 1000 : undefined;

            // Check for donation/super chat
            // Note: Super chat messages have a different renderer (liveChatPaidMessageRenderer)
            // For now, we'll just process text messages. Super chats can be added later.
            const isDonation = false;
            const donationAmount = undefined;
            const donationCurrency = undefined;

            // Create LiveChatMessage object
            const liveChatMessage: LiveChatMessage = {
                messageId,
                videoId: context.currentVideoId || '',
                author: authorName,
                authorChannelId,
                authorAvatarUrl: authorPhoto,
                isAuthorContentCreator,
                message: formatted.fullText || '',
                timestampUsec: String(timestampUsec),
                timestampMs,
                publishedDate: timestampMs,
                published: new Date(timestampMs).toISOString(),
                videoOffsetTimeSec: videoOffsetTimeSeconds,
                isMembership,
                isModerator,
                isVerified,
                isDonation,
                donationAmount,
                donationCurrency,
                badges: badges.length > 0 ? badges : undefined,
                hasReplies: false,
                replyCount: 0
            };

            messages.push(liveChatMessage);

        } catch (error: any) {
            logger.error(`[LiveChatProcessor] Error processing action ${i}:`, error);
            errors.push({
                type: LiveChatErrorType.PARSE_ERROR,
                message: `Failed to process action ${i}: ${error.message}`,
                originalError: error,
                timestamp: Date.now(),
                context: { actionIndex: i, action }
            });
        }
    }

    logger.success(`[LiveChatProcessor] Processed ${messages.length} messages, ${replies.length} replies, ${errors.length} errors`);

    return { messages, replies, errors };
}
