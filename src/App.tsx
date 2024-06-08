// src/App.tsx
import React from 'react';
import {useDispatch} from 'react-redux';
import SearchBar from './components/features/search/SearchBar';
import SidebarFilterPanel from './components/features/sidebar/SidebarFilterPanel';
import CommentList from './components/features/comments/CommentList';
import LoadingSection from './components/features/loading/LoadingSection';
import useAppState from './hooks/useAppState'; // Import the new custom hook
import './styles/App.css';
import useHandleUrlChange from "./hooks/useHandleUrlChange";

const App: React.FC = () => {

    const dispatch = useDispatch();

    const {
        comments,
        originalCommentsCount,
        filters,
        isLoading,
        commentsCount,
        repliesCount,
        transcriptsCount,
        initialLoadCompleted,
        handleSearch,
        loadComments,
        loadChatReplies,
        loadTranscript,
        loadAll,
        filteredAndSortedComments,
        setFiltersCallback
    } = useAppState();

    useHandleUrlChange();

    return (
        <div className="flex">
            <SidebarFilterPanel
                filters={filters}
                setFilters={setFiltersCallback}
            />
            <div className="flex-grow px-4">
                <LoadingSection
                    onLoadComments={loadComments}
                    onLoadChat={loadChatReplies}
                    onLoadTranscript={loadTranscript}
                    onLoadAll={loadAll}
                    commentsCount={commentsCount}
                    repliesCount={repliesCount}
                    transcriptsCount={transcriptsCount}
                />
                <SearchBar onSearch={handleSearch}/>
                <CommentList comments={filteredAndSortedComments} isLoading={isLoading}/>
            </div>
        </div>
    );
};

export default App;
