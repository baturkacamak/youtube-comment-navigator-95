import { transformCommentsData } from './transformCommentsData';
import logger from '../../../shared/utils/logger';

export const getCommentsFromData = (data: any) => {
  return data.frameworkUpdates?.entityBatchUpdate?.mutations || [];
};

export const getCommentKeysFromData = (data: any) => {
  return (
    data.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
    data.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems ||
    data.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
    []
  );
};

export const mergeCommentsWithViewModels = (
  transformedComments: any[],
  commentViewModels: any[]
) => {
  return transformedComments.map((transformedComment, index) => ({
    ...transformedComment,
    commentViewModel: commentViewModels[index] || { /* no-op */ },
  }));
};

const findMutationValue = (entityKey: string, path: string[], allComments: any[]) => {
  try {
    const mutation = allComments.find((item) => item.entityKey === entityKey);
    return path.reduce((accumulator, currentPath) => {
      if (accumulator && accumulator[currentPath]) {
        return accumulator[currentPath];
      }
      return '';
    }, mutation?.payload);
  } catch (e) {
    logger.warn(`Failed to find mutation value for ${entityKey}:`, e);
    return '';
  }
};

export const addAdditionalInfoToComments = (comments: any[], allComments: any[]) => {
  return comments.map((comment) => {
    const commentSurfaceKey = comment.commentViewModel?.commentSurfaceKey;
    const toolbarStateKey = comment.commentViewModel?.toolbarStateKey || false;
    const toolbarSurfaceKey = comment.commentViewModel?.toolbarSurfaceKey || false;

    const donationAmount = findMutationValue(
      commentSurfaceKey,
      [
        'commentSurfaceEntityPayload',
        'pdgCommentChip',
        'pdgCommentChipRenderer',
        'chipText',
        'simpleText',
      ],
      allComments
    );
    const isDonated = !!donationAmount;

    const heartState = findMutationValue(
      toolbarStateKey,
      ['engagementToolbarStateEntityPayload', 'heartState'],
      allComments
    );
    const isHearted = heartState === 'TOOLBAR_HEART_STATE_HEARTED';

    const likeAction = findMutationValue(
      toolbarSurfaceKey,
      [
        'engagementToolbarSurfaceEntityPayload',
        'likeCommand',
        'innertubeCommand',
        'performCommentActionEndpoint',
        'action',
      ],
      allComments
    );

    const { ...restOfComment } = comment;
    delete restOfComment.commentViewModel;

    return {
      ...restOfComment,
      isDonated,
      donationAmount,
      isHearted,
      likeAction,
    };
  });
};

export const processRawJsonCommentsData = (rawData: any[], videoId: string) => {
  try {
    const allComments = rawData.flatMap(getCommentsFromData);
    const allCommentKeys = rawData.flatMap(getCommentKeysFromData);

    const commentViewModels = allCommentKeys.map(
      (key: any) => key.commentThreadRenderer?.commentViewModel?.commentViewModel || { /* no-op */ }
    );

    const transformedComments = allComments
      .filter((comment: any) => {
        const payload = comment.payload?.commentEntityPayload;
        const isPinned = payload?.pinnedState === 'COMMENT_PINNED_STATE_PINNED';
        if (isPinned) { /* no-op */ }
        return payload && !isPinned;
      })
      .map((comment: any) => transformCommentsData(comment, videoId));

    const combinedComments = mergeCommentsWithViewModels(transformedComments, commentViewModels);
    const commentsWithAdditionalInfo = addAdditionalInfoToComments(combinedComments, allComments);

    
    return { items: commentsWithAdditionalInfo };
  } catch (error) {
    logger.error('Error processing raw JSON comments data:', error);
    return { items: [] };
  }
};
