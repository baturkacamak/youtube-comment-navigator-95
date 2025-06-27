import { Comment } from '../../../types/commentTypes';
import logger from './logger';

export const formatFileName = (extension: string, videoTitle: string): string => {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // Get current time in HH-MM-SS format
    const formattedTitle = videoTitle.replace(/[^a-zA-Z0-9]/g, '_'); // Replace non-alphanumeric characters with underscores
    return `${formattedTitle}_${date}_${time}.${extension}`;
};

export const exportJSON = async (comments: Comment[], fileName: string) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(comments));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

export const exportCSV = async (comments: Comment[], fileName: string) => {
    if (!comments || comments.length === 0) {
        logger.error('No comments to export');
        return;
    }
    const headers = Object.keys(comments[0]).join(',');
    const csv = [
        headers,
        ...comments.map(comment =>
            Object.values(comment)
                .map(value => `"${String(value).replace(/"/g, '""')}"`) // Convert value to string and wrap in double quotes, escape existing double quotes
                .join(',')
        )
    ].join('\n');

    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};
