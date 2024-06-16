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
    textSize: string;
    showBookmarked: boolean;
}
