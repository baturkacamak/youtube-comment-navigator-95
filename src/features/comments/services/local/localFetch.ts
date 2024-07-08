import { delay } from "../../../shared/utils/delay";
import { CommentData } from "../../../../types/commentTypes";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { fetchCommentFiles } from "../../utils/comments/fetchCommentJsonFiles";
import { v4 as uuidv4 } from 'uuid'; // Importing uuid library for unique identifiers
import { db } from "../../../shared/utils/database/database";
import { mapCommentDataToComment } from "../../utils/comments/mapCommentDataToComment"; // Import the utility function

const commentFiles: string[] = Array.from({ length: 2 }, () => `/example-comments/scratch_1.json`);

export const fetchCommentsFromLocalIncrementally = async (
    onCommentsFetched: (comments: CommentData[]) => void,
) => {
    let totalComments: CommentData[] = [];
    const videoId = 'localVideoId'; // Assuming a placeholder videoId for local data

    for (const file of commentFiles) {
        try {
            const response = await fetch(file);
            const rawJsonCommentsData = await response.json();
            const processedData = processRawJsonCommentsData([rawJsonCommentsData]);

            // Adding unique identifier to each comment
            const uniqueComments = processedData.items.map((comment: any) => {
                const mappedComment = mapCommentDataToComment(comment, videoId);
                return {
                    ...mappedComment,
                    content: mappedComment.content + Math.floor(Math.random() * 1000000),
                    likes: mappedComment.likes + Math.floor(Math.random() * 1000000),
                    publishedDate: mappedComment.publishedDate + Math.floor(Math.random() * 1000), // Slightly modifying the published date
                };
            });

            // Save comments to the database if not already saved
            for (const comment of uniqueComments) {
                const existingComment = await db.comments.where('commentId').equals(comment.commentId).first();
                if (!existingComment) {
                    await db.comments.put(comment);
                }
            }

            // totalComments = [...totalComments, ...uniqueComments];
            // onCommentsFetched(totalComments);
        } catch (error) {
            console.error(`Error fetching comment from ${file}:`, error);
        }
    }
};

export const fetchCommentsFromLocal = async () => {
    try {
        const data = await fetchCommentFiles(commentFiles);
        const videoId = 'localVideoId'; // Assuming a placeholder videoId for local data

        // Adding unique identifier to each comment
        const uniqueComments = data.map((comment: any) => {
            const mappedComment = mapCommentDataToComment(comment, videoId);
            return {
                ...mappedComment,
                commentId: mappedComment.commentId + uuidv4(), // Adding a unique identifier
                publishedDate: mappedComment.publishedDate + Math.floor(Math.random() * 1000), // Slightly modifying the published date
            };
        });

        // Save comments to the database if not already saved
        for (const comment of uniqueComments) {
            const existingComment = await db.comments.where('commentId').equals(comment.commentId).first();
            if (!existingComment) {
                await db.comments.put(comment);
            }
        }

        return processRawJsonCommentsData(uniqueComments);
    } catch (error) {
        console.error('Error fetching comments from local:', error);
        return { items: [] };
    }
};
