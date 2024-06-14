// src/App.tsx
import React, { useState } from 'react';
import SettingsDrawer from './features/settings/components/SettingsDrawer';
import ControlPanel from './features/sidebar/components/ControlPanel';
import SearchBar from './features/search/components/SearchBar';
import CommentList from './features/comments/components/CommentList';
import useAppState from './features/shared/hooks/useAppState';
import useHandleUrlChange from "./features/shared/hooks/useHandleUrlChange";
import './styles/App.scss';

const App: React.FC = () => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const openSettings = () => setIsSettingsOpen(true);
    const closeSettings = () => setIsSettingsOpen(false);

    const {
        filters,
        handleSearch,
        loadComments,
        loadChatReplies,
        loadTranscript,
        loadAll,
        filteredAndSortedComments,
        isLoading,
        commentsCount,
        repliesCount,
        transcriptsCount,
        setFiltersCallback
    } = useAppState();

    useHandleUrlChange();

    return (
        <div className="relative flex overflow-x-hidden">
            <SettingsDrawer isOpen={isSettingsOpen} onClose={closeSettings} />
            {isSettingsOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 transition-all z-10"
                    onClick={closeSettings}
                />
            )}
            <div
                className={`flex flex-col gap-4 w-full transition-all duration-500 relative ${isSettingsOpen ? 'blur-sm -ml-80 left-80' : 'ml-0 left-0'}`}
            >
                <ControlPanel
                    filters={filters}
                    setFilters={setFiltersCallback}
                    onLoadComments={loadComments}
                    onLoadChat={loadChatReplies}
                    onLoadTranscript={loadTranscript}
                    onLoadAll={loadAll}
                    commentsCount={commentsCount}
                    repliesCount={repliesCount}
                    transcriptsCount={transcriptsCount}
                    openSettings={openSettings}
                />
                <SearchBar onSearch={handleSearch} />
                <CommentList comments={filteredAndSortedComments} isLoading={isLoading} />
            </div>
        </div>
    );
};

export default App;
