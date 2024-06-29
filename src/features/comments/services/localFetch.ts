// src/services/comments/localFetch.ts
import { fetchCommentFiles, processRawJsonCommentsData } from "../utils/utils";
import {isLocalEnvironment} from "../../shared/utils/environmentVariables";
import {fetchCommentsFromRemote} from "./remoteFetch";
import {delay} from "../../shared/utils/delay";
import {CommentData} from "../../../types/commentTypes";
import {removeDuplicateComments} from "../utils/removeDuplicateComments";
const commentFiles: string[] = [];
for (let i = 1; i <= 34; i++) {
    commentFiles.push(`/example-comments/example-replies/scratch_${i}.json`);
}

export const fetchCommentsIncrementally = async (
    onCommentFetched: (comment: any) => void,
    signal?: AbortSignal,
    byPassCache: boolean = false,
    continuationToken?: string | undefined
) => {
    if (isLocalEnvironment()) {
        await fetchCommentsFromLocalIncrementally(onCommentFetched, signal);
    } else {
        await fetchCommentsFromRemote(onCommentFetched, signal, byPassCache, continuationToken);
    }
};

const fetchCommentsFromLocalIncrementally = async (
    onCommentsFetched: (comments: any[]) => void,
    signal?: AbortSignal
) => {
    let totalComments: CommentData[] = [];

    for (const file of commentFiles) {
        if (signal?.aborted) {
            return;
        }

        try {
            const response = await fetch(file, { signal });
            const comment = await response.json();
            const processedComments = processRawJsonCommentsData([comment]);
            totalComments.push(...processedComments.items);
            const uniqueTempComments = removeDuplicateComments(totalComments);
            onCommentsFetched(uniqueTempComments);
            await delay(500);
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