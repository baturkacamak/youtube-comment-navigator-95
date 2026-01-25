import {Comment} from "./commentTypes";
import {LiveChatMessage, LiveChatFetchState} from "./liveChatTypes";
import {FilterState} from "./filterTypes"; // Adjust the path as necessary
import {Option} from "./utilityTypes";

export interface RootState {
    comments: Comment[];
    liveChat: LiveChatMessage[]; // Changed from Comment[] to LiveChatMessage[]
    liveChatState: LiveChatFetchState; // Added livechat fetch state
    transcripts: any[];
    filters: FilterState;
    isLoading: boolean;
    showBookmarked: boolean;
    bookmarkedComments: Comment[];
    bookmarkedLiveChatMessages: LiveChatMessage[]; // Added bookmarked livechat messages
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
    liveChatMessageCount: number; // Added separate count for livechat messages
}

