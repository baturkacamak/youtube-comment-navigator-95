// src/services/comments/localFetch.ts
import { fetchCommentFiles, processCommentsData } from "../utils/utils";
import {isLocalEnvironment} from "../../utils/environmentVariables";
import {fetchCommentsFromRemote} from "./remoteFetch";
const commentFiles: string[] = [];
for (let i = 1; i <= 34; i++) {
    commentFiles.push(`/example-comments/scratch_${i}.json`);
}

export const fetchCommentsIncrementally = async (
    onCommentFetched: (comment: any) => void,
    signal?: AbortSignal
) => {
    if (isLocalEnvironment()) {
        await fetchCommentsFromLocalIncrementally(onCommentFetched, signal);
    } else {
        await fetchCommentsFromRemote(onCommentFetched, signal);
    }
};

const fetchCommentsFromLocalIncrementally = async (
    onCommentsFetched: (comments: any[]) => void,
    signal?: AbortSignal
) => {
    for (const file of commentFiles) {
        if (signal?.aborted) {
            return;
        }

        try {
            const response = await fetch(file, { signal });
            const comment = await response.json();
            const processedComments = processCommentsData([comment]);
            onCommentsFetched(processedComments.items);
            await new Promise(resolve => setTimeout(resolve, 500));
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
        return processCommentsData(data);
    } catch (error) {
        console.error('Error fetching comments from local:', error);
        return { items: [] };
    }
};