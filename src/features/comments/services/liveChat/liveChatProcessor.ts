import { Comment } from "../../../../types/commentTypes";
import { ensureTextMessageRenderer, formatChatRuns, markTimelineLinks, prepareChatCommentFields } from './utils';
import { wrapTryCatch } from './common';

export interface ChatProcessingContext {
    currentVideoId?: string;
    broadcastStartTime?: string;
}

export function processLiveChatActions(actions: any[], context: ChatProcessingContext): Comment[] {
    const comments: Comment[] = [];

    if (!Array.isArray(actions) || actions.length === 0) return comments;

    for (const action of actions) {
        try {
            // Normalize structure to be similar to replay actions if needed, or handle both
            // Live chat actions usually have `addChatItemAction` directly or wrapped
            
            // We construct a wrapper similar to YCS-cont to reuse their utils
            const commentWrapper = {
                replayChatItemAction: {
                    actions: [action]
                }
            };

            // If it's a raw action from get_live_chat (not replay), it might not be wrapped in replayChatItemAction
            // But ensureTextMessageRenderer expects it.
            // Let's adjust based on what we see in ensureTextMessageRenderer.
            // It expects `replayChatItemAction.actions[0]`.
            // So wrapping it is correct if 'action' is one of the items in 'actions' list from API.
            
            ensureTextMessageRenderer(commentWrapper);

            const timestampUsec = wrapTryCatch(
                () =>
                    commentWrapper.replayChatItemAction.actions[0].addChatItemAction.item.liveChatTextMessageRenderer
                        .timestampUsec
            ) as string | undefined;

            const timestamp = Number.parseInt(String(timestampUsec ?? ''), 10);
            if (!timestamp || Number.isNaN(timestamp)) {
                continue;
            }

            const renderer = wrapTryCatch(
                () => commentWrapper.replayChatItemAction.actions[0].addChatItemAction.item.liveChatTextMessageRenderer
            );
            if (!renderer) continue;

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
            if (!hasAuthor && !renderer.message.fullText) continue;

            const prepared = prepareChatCommentFields(commentWrapper);
            
            // Map to Comment interface
            // We need to extract fields from `renderer`
            const authorName = renderer.authorName?.simpleText || 'Unknown';
            const authorPhoto = renderer.authorPhoto?.thumbnails?.[0]?.url || '';
            const commentId = renderer.id || `chat-${timestamp}-${Math.random()}`;
            
            // Calculate relative time or use published date
            const publishedDate = timestamp / 1000; // ms
            
            const newComment: Comment = {
                author: authorName,
                likes: 0,
                viewLikes: "0",
                content: formatted.fullText, // Use fullText for now. 
                published: new Date(publishedDate).toISOString(), // Format as string
                publishedDate: publishedDate,
                authorAvatarUrl: authorPhoto,
                isAuthorContentCreator: false, // Need to check badges
                authorChannelId: renderer.authorExternalChannelId || '',
                replyCount: 0,
                commentId: commentId,
                replyLevel: 0,
                hasTimestamp: formatted.hasTimelineLink,
                hasLinks: false, // Check if links exist
                videoId: context.currentVideoId,
                
                // Extra fields for chat
                // isLiveChat: true // We can add this if we update the type
            };

            // Check badges for verification/owner
            if (renderer.authorBadges) {
                for (const badge of renderer.authorBadges) {
                    const tooltip = badge.liveChatAuthorBadgeRenderer?.tooltip;
                    if (tooltip?.includes('Verified')) {
                        // verified
                    }
                    if (badge.liveChatAuthorBadgeRenderer?.icon?.iconType === 'OWNER') {
                        newComment.isAuthorContentCreator = true;
                    }
                }
            }
            
            comments.push(newComment);

        } catch (error) {
            console.error(error);
        }
    }

    return comments;
}
