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
    const lowercasedKeyword = keyword.toLowerCase();
    return transcripts.reduce((count, entry) => {
        const wordArray = entry.text.split(/\s+/);
        const filteredWordArray = wordArray.filter(word => word.toLowerCase().includes(lowercasedKeyword));
        return count + filteredWordArray.length;
    }, 0);
};