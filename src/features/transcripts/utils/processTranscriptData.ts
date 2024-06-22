// src/features/transcripts/utils/processTranscriptData.ts

export interface TranscriptEntry {
    start: number;
    duration: number;
    text: string;
}

export interface ProcessedTranscript {
    items: TranscriptEntry[];
    totalDuration: number;
}

export const processTranscriptData = (data: any): ProcessedTranscript => {
    if (!data || !Array.isArray(data.events)) {
        throw new Error("Invalid transcript data format");
    }

    const items: TranscriptEntry[] = data.events
        .filter((event: any) => event.segs && event.segs.length > 0) // Only include events that have segs
        .map((event: any) => {
            const text = event.segs.map((seg: any) => seg.utf8).join('');
            return {
                start: parseFloat(event.tStartMs) / 1000, // Convert milliseconds to seconds
                duration: parseFloat(event.dDurationMs) / 1000, // Convert milliseconds to seconds
                text,
            };
        })
        .filter((item: TranscriptEntry) => item.text.trim() !== ''); // Filter out items with empty text

    const totalDuration = items.reduce((acc, item) => acc + item.duration, 0);

    return {
        items,
        totalDuration,
    };
};
