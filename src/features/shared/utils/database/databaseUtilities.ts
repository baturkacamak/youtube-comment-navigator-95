import {calculateNormalized, getMaxValues} from "../../../comments/hooks/sorting/advanced/calculateNormalized";
import {
    calculateBayesianAverage,
    getAvgValues
} from "../../../comments/hooks/sorting/advanced/calculateBayesianAverage";
import {calculateWeightedZScore, getStats} from "../../../comments/hooks/sorting/advanced/calculateWeightedZScore";
import {Comment} from "../../../../types/commentTypes";

import {db} from "./database";

export const storeCommentsInDB = async (comments: Comment[], videoId: string) => {
    const maxValues = getMaxValues(comments);
    const stats = getStats(comments);
    const avgValues = getAvgValues(comments);

    const commentsWithCalculatedValues = comments.map(comment => ({
        ...comment,
        videoId,
        wordCount: comment.content.split(' ').length,
        normalizedScore: calculateNormalized(comment, maxValues),
        weightedZScore: calculateWeightedZScore(comment, stats),
        bayesianAverage: calculateBayesianAverage(comment, avgValues)
    }));

    await db.comments.bulkPut(commentsWithCalculatedValues);
};
