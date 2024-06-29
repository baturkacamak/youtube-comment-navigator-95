// src/features/comments/utils/handleFetchedComments.ts

import { removeDuplicateComments } from "./removeDuplicateComments";
import { CommentData } from "../../../../types/commentTypes";
import {processRawJsonCommentsData} from "./retrieveYouTubeCommentPaths";

export const handleFetchedComments = (
    rawComments: any[],
    onCommentsFetched: (comments: any[]) => void,
    totalComments: CommentData[]
) => {
    const processedData = processRawJsonCommentsData(rawComments);
    totalComments.push(...processedData.items);
    const uniqueComments = removeDuplicateComments(totalComments);
    onCommentsFetched(uniqueComments);
};
