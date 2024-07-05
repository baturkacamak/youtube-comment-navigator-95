import { delay } from "../../shared/utils/delay";
import { CommentData } from "../../../types/commentTypes";
import {handleFetchedComments} from "../utils/comments/handleFetchedComments";
import {processRawJsonCommentsData} from "../utils/comments/retrieveYouTubeCommentPaths";
import {fetchCommentFiles} from "../utils/comments/fetchCommentJsonFiles";
const commentFiles: string[] = Array.from({ length: 2 }, (_, i) => `/example-comments/example-replies/scratch_${i + 1}.json`);

export const fetchCommentsFromLocalIncrementally = async (
    onCommentsFetched: (comments: any[]) => void,
) => {
    let totalComments: CommentData[] = [];

    for (const file of commentFiles) {
        try {
            const response = await fetch(file);
            const comment = await response.json();
            handleFetchedComments([comment], onCommentsFetched, totalComments);
        } catch (error) {
            console.error(`Error fetching comment from ${file}:`, error);
        }
    }
};

export const fetchCommentsFromLocal = async () => {
    try {
        const data = await fetchCommentFiles(commentFiles);
        return processRawJsonCommentsData(data);
    } catch (error) {
        console.error('Error fetching comments from local:', error);
        return { items: [] };
    }
};
