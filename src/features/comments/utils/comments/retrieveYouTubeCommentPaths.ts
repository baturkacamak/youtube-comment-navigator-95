import {transformCommentsData} from "./transformCommentsData";

export const getCommentsFromData = (data: any) => {
    return data.frameworkUpdates?.entityBatchUpdate?.mutations || [];
};
export const getCommentKeysFromData = (data: any) => {
    return data.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems || data.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];
};
export const mergeCommentsWithViewModels = (transformedComments: any[], commentViewModels: any[]) => {
    return transformedComments.map((transformedComment, index) => ({
        ...transformedComment,
        commentViewModel: commentViewModels[index] || {},
    }));
};

// Helper function to find a mutation by key and extract a value from a nested path
const findMutationValue = (entityKey: string, path: string[], allComments: any[]) => {

    // Find the mutation object with the matching entityKey
    const mutation = allComments.find(item => item.entityKey === entityKey);

    // Use the path array to navigate through the nested properties of the mutation payload
    return path.reduce((accumulator, currentPath) => {
        if (accumulator && accumulator[currentPath]) {
            return accumulator[currentPath]; // Move to the next nested property
        }
        return ''; // Return an empty string if the path does not exist
    }, mutation?.payload);
};

// Helper function to retrieve a value from a nested object path in a mutation
export const addAdditionalInfoToComments = (comments: any[], allComments: any[]) => {
    return comments.map(comment => {
        const commentSurfaceKey = comment.commentViewModel?.commentSurfaceKey;
        const toolbarStateKey = comment.commentViewModel?.toolbarStateKey || false;
        const toolbarSurfaceKey = comment.commentViewModel?.toolbarSurfaceKey || false;

        const donationAmount = findMutationValue(commentSurfaceKey, ['commentSurfaceEntityPayload', 'pdgCommentChip', 'pdgCommentChipRenderer', 'chipText', 'simpleText'], allComments);
        const isDonated = !!donationAmount;

        const heartState = findMutationValue(toolbarStateKey, ['engagementToolbarStateEntityPayload', 'heartState'], allComments);
        const isHearted = heartState === 'TOOLBAR_HEART_STATE_HEARTED';

        const likeAction = findMutationValue(toolbarSurfaceKey, ['engagementToolbarSurfaceEntityPayload', 'likeCommand', 'innertubeCommand', 'performCommentActionEndpoint', 'action'], allComments);

        const { commentViewModel, ...restOfComment } = comment;

        return {
            ...restOfComment,
            isDonated,
            donationAmount,
            isHearted,
            likeAction,
        };
    });
};


export const processRawJsonCommentsData = (data: any[], videoId: string) => {
    const allComments = data.flatMap(getCommentsFromData);
    const allCommentKeys = data.flatMap(getCommentKeysFromData);

    // Extracting commentViewModels
    const commentViewModels = allCommentKeys.map((key: any) => key.commentThreadRenderer?.commentViewModel?.commentViewModel || {});

    // Filtering and transforming comments
    const transformedComments = allComments
        .filter((comment: any) => comment.payload?.commentEntityPayload)
        .map((comment: any) => transformCommentsData(comment, videoId));  // Pass videoId here

    const combinedComments = mergeCommentsWithViewModels(transformedComments, commentViewModels);
    // Add donation and heart information to comments
    const commentsWithAdditionalInfo = addAdditionalInfoToComments(combinedComments, allComments);
    return {items: commentsWithAdditionalInfo};
};