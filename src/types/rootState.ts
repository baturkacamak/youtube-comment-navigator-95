import {Comment} from "./commentTypes";
import {FilterState} from "./filterTypes"; // Adjust the path as necessary

export interface RootState {
    originalComments: Comment[];
    comments: Comment[];
    replies: any[];
    transcripts: any[];
    filters: FilterState;
    isLoading: boolean;
    showBookmarked: boolean;
    bookmarkedComments: any[];
    settings: {
        textSize: string;
        showFiltersSorts: boolean;
        fontFamily: string;
    };
    filteredTranscripts: any[];
    bookmarkedLines: any[];
    transcriptSelectedLanguage: { value: string, label: string };
    searchKeyword: string;
}

