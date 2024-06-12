// src/App.tsx
import React, { useState } from 'react';
import SettingsDrawer from './components/common/SettingsDrawer';
import ControlPanel from './components/features/sidebar/ControlPanel';
import SearchBar from './components/features/search/SearchBar';
import CommentList from './components/features/comments/CommentList';
import useAppState from './hooks/useAppState';
import useHandleUrlChange from "./hooks/useHandleUrlChange";
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
                    className="relative inset-0 bg-black bg-opacity-50 transition-all z-10"
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
