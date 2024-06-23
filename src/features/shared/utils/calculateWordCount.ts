interface TranscriptEntry {
    start: number;
    text: string;
}

export const calculateWordCount = (transcripts: TranscriptEntry[]): number => {
    return transcripts.reduce((count, entry) => {
        return count + entry.text.split(/\s+/).length;
    }, 0);
};