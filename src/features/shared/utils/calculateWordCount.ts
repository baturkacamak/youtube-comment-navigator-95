import {normalizeString} from "./normalizeString";

interface TranscriptEntry {
    start: number;
    text: string;
}

export const calculateWordCount = (transcripts: TranscriptEntry[]): number => {
    return transcripts.reduce((count, entry) => {
        return count + entry.text.split(/\s+/).length;
    }, 0);
};

export const calculateFilteredWordCount = (transcripts: TranscriptEntry[], keyword: string): number => {
    const normalizedKeyword = normalizeString(keyword);
    return transcripts.reduce((count, entry) => {
        const wordArray = entry.text.split(/\s+/);
        const filteredWordArray = wordArray.filter(word => normalizeString(word).includes(normalizedKeyword));
        return count + filteredWordArray.length;
    }, 0);
};