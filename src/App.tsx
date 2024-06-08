// src/App.tsx
import React, {useRef} from 'react';
import {useDispatch} from 'react-redux';
import SearchBar from './components/features/search/SearchBar';
import SidebarFilterPanel from './components/features/sidebar/SidebarFilterPanel';
import CommentList from './components/features/comments/CommentList';
import LoadingSection from './components/features/loading/LoadingSection';
import useUrlChange from './hooks/useUrlChange'; // Import the custom hook
import useAppState from './hooks/useAppState'; // Import the new custom hook
import {fetchContinuationTokenFromRemote} from "./services/comments/fetchContinuationData";
import {fetchCommentsFromRemote} from "./services/comments/remoteFetch";

import './styles/App.css';
import {resetState, setComments, setLoading, updateCommentsData} from "./store/store";
import {processCommentsData} from "./services/utils/utils";

const App: React.FC = () => {

    const dispatch = useDispatch();
    const abortController = useRef<AbortController | null>(null);

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

    console.log('App');

    const handleFetchedComments = (comments: any[]) => {
        dispatch(updateCommentsData({comments, isLoading: false}));
    };

    useUrlChange(async () => {
        if (abortController.current) {
            abortController.current.abort();
        }
        abortController.current = new AbortController();
        const signal = abortController.current.signal;

        dispatch(resetState());
        const continuationToken = await fetchContinuationTokenFromRemote();
        console.log(continuationToken)
        await fetchCommentsFromRemote(handleFetchedComments, signal, false, continuationToken);
    });


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
