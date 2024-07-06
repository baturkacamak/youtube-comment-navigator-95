import { delay } from "../../../shared/utils/delay";
import { CommentData } from "../../../../types/commentTypes";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { fetchCommentFiles } from "../../utils/comments/fetchCommentJsonFiles";
import { v4 as uuidv4 } from 'uuid'; // Importing uuid library for unique identifiers

const commentFiles: string[] = Array.from({ length: 10000 }, () => `/example-comments/scratch_1.json`);

export const fetchCommentsFromLocalIncrementally = async (
    onCommentsFetched: (comments: any[]) => void,
) => {
    let totalComments: CommentData[] = [];

    for (const file of commentFiles) {
        try {
            const response = await fetch(file);
            const rawJsonCommentsData = await response.json();
            const processedData = processRawJsonCommentsData([rawJsonCommentsData]);
            // Adding unique identifier to each comment
            const uniqueComments = processedData.items.map((comment: any) => ({
                ...comment,
                commentId: comment.commentId + uuidv4(),
                content: comment.content +  Math.floor(Math.random() * 1000000),
                likes: comment.likes + Math.floor(Math.random() * 1000000),
                publishedDate: comment.publishedDate + Math.floor(Math.random() * 1000) // Slightly modifying the published date
            }));
            totalComments = [...totalComments, ...uniqueComments];
            onCommentsFetched(totalComments);
        } catch (error) {
            console.error(`Error fetching comment from ${file}:`, error);
        }
    }
};

export const fetchCommentsFromLocal = async () => {
    try {
        const data = await fetchCommentFiles(commentFiles);

        // Adding unique identifier to each comment
        const uniqueComments = data.map((comment: any) => ({
            ...comment,
            uniqueId: uuidv4(), // Adding a unique identifier
            publishedDate: comment.publishedDate + Math.floor(Math.random() * 1000) // Slightly modifying the published date
        }));

        return processRawJsonCommentsData(uniqueComments);
    } catch (error) {
        console.error('Error fetching comments from local:', error);
        return { items: [] };
    }
};
