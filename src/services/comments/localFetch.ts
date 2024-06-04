// src/services/comments/localFetch.ts
import { fetchCommentFiles, processCommentsData } from "../utils/utils";

const commentFiles: string[] = [];
for (let i = 1; i <= 34; i++) {
    commentFiles.push(`/example-comments/scratch_${i}.json`);
}

export const fetchCommentsFromLocal = async () => {
    try {
        const data = await fetchCommentFiles(commentFiles);
        return processCommentsData(data);
    } catch (error) {
        console.error('Error fetching comments from local:', error);
        return { items: [] };
    }
};
