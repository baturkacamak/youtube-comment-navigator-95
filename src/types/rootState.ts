import {Comment} from "./commentTypes";
import {FilterState} from "./filterTypes"; // Adjust the path as necessary
import {Option} from "./utilityTypes";

export interface RootState {
    comments: Comment[];
    transcripts: any[];
    filters: FilterState;
    isLoading: boolean;
    showBookmarked: boolean;
    bookmarkedComments: Comment[];
    settings: {
        textSize: string;
        showFiltersSorts: boolean;
        fontFamily: string;
        showContentOnSearch: boolean;
    };
    filteredTranscripts: any[];
    bookmarkedLines: any[];
    transcriptSelectedLanguage: Option;
    searchKeyword: string;
    filteredAndSortedComments: Comment[];
    filteredAndSortedBookmarks: Comment[];
    totalCommentsCount: number;
}

