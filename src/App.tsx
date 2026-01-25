import React, { useState } from 'react';
import SettingsDrawer from './features/settings/components/SettingsDrawer';
import ControlPanel from './features/sidebar/components/ControlPanel';
import SearchBar from './features/search/components/SearchBar';
import CommentList from './features/comments/components/CommentList';
import LiveChatList from './features/comments/components/LiveChatList';
import BookmarkedComments from './features/comments/components/BookmarkedComments';
import Transcript from './features/transcripts/components/Transcript';
import useAppState from './features/shared/hooks/useAppState';
import './styles/App.scss';
import NavigationHeader from "./features/navigation-header/components/NavigationHeader";
import Box from "./features/shared/components/Box";
import { useTranslation } from "react-i18next";
import { BookmarkIcon, ChatBubbleOvalLeftIcon, DocumentTextIcon, InboxIcon } from '@heroicons/react/24/outline';
import Tabs from "./features/shared/components/Tabs";
import {useDispatch, useSelector} from 'react-redux';
import { RootState } from "./types/rootState";
import i18n from "i18next";

const App: React.FC = () => {
    const { t } = useTranslation();
    const isRtl = i18n.dir() === 'rtl';

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const showFiltersSorts = useSelector((state: RootState) => state.settings.showFiltersSorts);
    const showContentOnSearch = useSelector((state: RootState) => state.settings.showContentOnSearch); // Get the state
    const searchKeyword = useSelector((state: RootState) => state.searchKeyword); // Get the search keyword
    const liveChatMessageCount = useSelector((state: RootState) => state.liveChatMessageCount); // Get livechat count
    const dispatch = useDispatch();

    const openSettings = () => setIsSettingsOpen(true);
    const closeSettings = () => setIsSettingsOpen(false);

    const {
        filters,
        filteredAndSortedComments,
        setFiltersCallback,
        setActiveTab,
        activeTab,
        transcriptWordCount,
        filteredAndSortedBookmarks,
        transcript,
        totalCommentsCount
    } = useAppState();

    const hasActiveFilters =
        !!filters.keyword ||
        filters.verified ||
        filters.hasLinks ||
        filters.likesThreshold.min > 0 ||
        filters.likesThreshold.max < Infinity ||
        filters.repliesLimit.min > 0 ||
        filters.repliesLimit.max < Infinity ||
        filters.wordCount.min > 0 ||
        filters.wordCount.max < Infinity ||
        !!filters.dateTimeRange.start ||
        !!filters.dateTimeRange.end ||
        !!searchKeyword;

    // Show either filtered count or total count
    const displayCount = hasActiveFilters ? filteredAndSortedComments.length : totalCommentsCount;

    const tabs = React.useMemo(() => [
        {
            title: {
                id: 'comments',
                label: `${t('Comments')} (${displayCount})`,
                icon: ChatBubbleOvalLeftIcon,
            },
            content: (
                <>
                    <div className="dark:bg-gray-800 p-4 shadow rounded-lg mb-4">
                        <ControlPanel
                            filters={filters}
                            setFilters={setFiltersCallback}
                            comments={filteredAndSortedComments}
                        />
                    </div>
                    <CommentList />
                </>
            ),
        },
        {
            title: {
                id: 'transcript',
                label: `${t('Transcript')} (${transcriptWordCount})`,
                icon: DocumentTextIcon,
            },
            content: <Transcript transcripts={transcript} />,
        },
        {
            title: {
                id: 'livechat',
                label: `${t('Live Chat')} (${liveChatMessageCount})`,
                icon: InboxIcon,
            },
            content: <LiveChatList />,
        },
        {
            title: {
                id: 'bookmarks',
                label: `${t('Bookmarks')} (${filteredAndSortedBookmarks.length})`,
                icon: BookmarkIcon,
            },
            content: (
                <>
                    {showFiltersSorts && (
                        <div className="dark:bg-gray-800 p-4 shadow rounded-lg mb-4">
                            <ControlPanel
                                filters={filters}
                                setFilters={setFiltersCallback}
                                comments={filteredAndSortedBookmarks}
                            />
                        </div>
                    )}
                    <BookmarkedComments comments={filteredAndSortedBookmarks} />
                </>
            ),
        },
    ], [
        t,
        displayCount,
        filters,
        setFiltersCallback,
        filteredAndSortedComments,
        transcriptWordCount,
        transcript,
        filteredAndSortedBookmarks,
        showFiltersSorts
    ]);

    let drawerClass = 'ml-0 left-0';
    if (isSettingsOpen) {
        drawerClass = 'blur-sm -ml-80 left-80';
    }

    if (isRtl) {
        drawerClass = 'mr-0 right-0';
        if (isSettingsOpen) {
            drawerClass = 'blur-sm -mr-80 right-80';
        }
    }

    return (
        <div
            className={`relative flex overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded transition-max-h ease-in-out duration-300 max-h-screen custom-scrollbar`}>
            <div className={`transition-all ease-in-out duration-500 ${isSettingsOpen ? 'max-h-[1000px] opacity-1' : 'max-h-0 opacity-0'}`}>
                <SettingsDrawer isOpen={isSettingsOpen} onClose={closeSettings} />
                {isSettingsOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 transition-all z-10"
                        onClick={closeSettings}
                    />
                )}
            </div>
            <div
                className={`flex flex-col gap-4 w-full transition-all duration-500 relative ${drawerClass}`}
            >
                <Box className="flex flex-col w-full gap-2" aria-label={t('Control Panel')}
                     borderColor={'border-transparent'}>
                    <NavigationHeader
                        openSettings={openSettings}
                    />
                    <hr className="border border-solid border-gray-200 dark:border-gray-600" />
                    <SearchBar />
                </Box>
                {(!showContentOnSearch || searchKeyword) && (
                    <Box className="flex flex-col w-full gap-2" borderColor={'border-transparent'}>
                        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                    </Box>
                )}
            </div>
        </div>
    );
};

export default App;
