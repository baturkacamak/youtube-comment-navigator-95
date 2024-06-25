// src/services/comments/utils.ts
import { transformComment } from "./transformComments";

export const fetchCommentFiles = async (commentFiles: string[]) => {
    const fetchPromises = commentFiles.map(async (file) => {
        const response = await fetch(file);
        return response.json();
    });

    return Promise.all(fetchPromises);
};

export const extractComments = (data: any) => {
    return data.frameworkUpdates?.entityBatchUpdate?.mutations || [];
};

export const extractCommentKeys = (data: any) => {
    return data.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems || data.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];
};

export const combineCommentsWithViewModels = (transformedComments: any[], commentViewModels: any[]) => {
    return transformedComments.map((transformedComment, index) => ({
        ...transformedComment,
        commentViewModel: commentViewModels[index] || {},
    }));
};

export const addAdditionalInfoToComments = (comments: any[], allComments: any[]) => {
    return comments.map((comment) => {
        const commentSurfaceKey = comment.commentViewModel?.commentSurfaceKey;
        const toolbarStateKey = comment.commentViewModel?.toolbarStateKey || false;
        const toolbarSurfaceKey = comment.commentViewModel?.toolbarSurfaceKey || false;

        let isDonated = false;
        let donationAmount = '';
        let isHearted = false;
        let likeAction = '';

        if (commentSurfaceKey) {
            const matchingMutation = allComments.find((mutation) => mutation.entityKey === commentSurfaceKey);
            if (matchingMutation) {
                donationAmount = matchingMutation.payload?.commentSurfaceEntityPayload?.pdgCommentChip?.pdgCommentChipRenderer?.chipText?.simpleText || '';
                isDonated = !!donationAmount;
            }
        }

        if (toolbarStateKey) {
            const matchingToolbarState = allComments.find((mutation) => mutation.entityKey === toolbarStateKey);
            if (matchingToolbarState) {
                const heartState = matchingToolbarState.payload?.engagementToolbarStateEntityPayload?.heartState;
                isHearted = heartState === 'TOOLBAR_HEART_STATE_HEARTED';
            }
        }

        if (toolbarSurfaceKey) {
            const matchingToolbarSurface = allComments.find((mutation) => mutation.entityKey === toolbarSurfaceKey);
            if (matchingToolbarSurface) {
                likeAction = matchingToolbarSurface.payload?.engagementToolbarSurfaceEntityPayload?.likeCommand?.innertubeCommand?.performCommentActionEndpoint?.action || '';
            }
        }

        return {
            ...comment,
            isDonated,
            donationAmount,
            isHearted,
            likeAction,
        };
    });
};

export const processRawJsonCommentsData = (data: any[]) => {
    const allComments = data.flatMap(extractComments);
    const allCommentKeys = data.flatMap(extractCommentKeys);

    // Extracting commentViewModels
    const commentViewModels = allCommentKeys.map((key: any) => key.commentThreadRenderer?.commentViewModel?.commentViewModel || {});

    // Filtering and transforming comments
    const transformedComments = allComments
        .filter((comment: any) => comment.payload?.commentEntityPayload)
        .map(transformComment);

    // Combine transformedComments with their corresponding commentViewModels
    const combinedComments = combineCommentsWithViewModels(transformedComments, commentViewModels);

    // Add donation and heart information to comments
    const commentsWithAdditionalInfo = addAdditionalInfoToComments(combinedComments, allComments);

    return { items: commentsWithAdditionalInfo };
};
