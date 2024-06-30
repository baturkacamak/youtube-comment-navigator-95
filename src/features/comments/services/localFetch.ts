import { delay } from "../../shared/utils/delay";
import { CommentData } from "../../../types/commentTypes";
import {handleFetchedComments} from "../utils/comments/handleFetchedComments";
import {processRawJsonCommentsData} from "../utils/comments/retrieveYouTubeCommentPaths";
import {fetchCommentFiles} from "../utils/comments/fetchCommentJsonFiles";
const commentFiles: string[] = Array.from({ length: 34 }, (_, i) => `/example-comments/example-replies/scratch_${i + 1}.json`);

export const fetchCommentsFromLocalIncrementally = async (
    onCommentsFetched: (comments: any[]) => void,
    signal?: AbortSignal
) => {
    let totalComments: CommentData[] = [];

    for (const file of commentFiles) {
        if (signal?.aborted) return;

        try {
            const response = await fetch(file, { signal });
            const comment = await response.json();
            handleFetchedComments([comment], onCommentsFetched, totalComments);
        } catch (error) {
            if (signal?.aborted) {
                console.log(`Fetch aborted for ${file}`);
                return;
            }
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
