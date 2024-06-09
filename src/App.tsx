// src/App.tsx
import React from 'react';
import {useDispatch} from 'react-redux';
import SearchBar from './components/features/search/SearchBar';
import ControlPanel from './components/features/sidebar/ControlPanel';
import CommentList from './components/features/comments/CommentList';
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
        <div className="flex flex-col gap-4">
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
            />
            <SearchBar onSearch={handleSearch}/>
            <CommentList comments={filteredAndSortedComments} isLoading={isLoading}/>
        </div>
    );
};

export default App;
