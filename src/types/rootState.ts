import { Comment } from "./commentTypes";
import {FilterState} from "./filterTypes"; // Adjust the path as necessary

export interface RootState {
    originalComments: Comment[];
    comments: Comment[];
    replies: any[];
    transcripts: any[];
    filters: FilterState;
    isLoading: boolean;
    commentsCount: number;
    repliesCount: number;
    transcriptsCount: number;
    showBookmarked: boolean;
    bookmarkedComments: any[];
    isUrlChanged: boolean;
    settings: {
        textSize: string;
        showFiltersSorts: boolean;
    };
    filteredTranscripts: any[];
    bookmarkedLines: any[]
}

