// src/App.tsx
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SearchBar from './components/features/search/SearchBar';
import SidebarFilterPanel from './components/features/sidebar/SidebarFilterPanel';
import CommentList from './components/features/comments/CommentList';
import LoadingSection from './components/features/loading/LoadingSection';
import useComments from './hooks/useComments';
import useSortedComments from './hooks/useSortedComments';
import useFilteredComments from './hooks/useFilteredComments';
import useLoadComments from './hooks/useLoadComments';
import useSearchComments from './hooks/useSearchComments';
import useUrlChange from './hooks/useUrlChange'; // Import the custom hook
import { setFilters } from './store/store';
import './styles/App.css';
import { Filters } from "./types/filterTypes";
import { RootState } from "./types/rootState"; // Import RootState type

const App: React.FC = () => {
    const dispatch = useDispatch();

    // Using individual useSelector calls to avoid unnecessary re-renders
    const comments = useSelector((state: RootState) => state.comments);
    const originalComments = useSelector((state: RootState) => state.originalComments);
    const filters = useSelector((state: RootState) => state.filters);
    const isLoading = useSelector((state: RootState) => state.isLoading);
    const commentsCount = useSelector((state: RootState) => state.commentsCount);
    const repliesCount = useSelector((state: RootState) => state.repliesCount);
    const transcriptsCount = useSelector((state: RootState) => state.transcriptsCount);

    const originalCommentsCount = originalComments.length;

    const { initialLoadCompleted } = useComments();
    const { sortComments } = useSortedComments(initialLoadCompleted);
    const { filterComments } = useFilteredComments(initialLoadCompleted);
    const { handleSearch } = useSearchComments();
    const { loadComments, loadChatReplies, loadTranscript, loadAll } = useLoadComments();

    useUrlChange(() => loadComments(true));

    const filteredAndSortedComments = useMemo(() => {
        return filterComments(sortComments(comments, filters.sortBy, filters.sortOrder), filters);
    }, [filters, sortComments, filterComments]);

    const setFiltersCallback = useCallback((filters: Filters) => {
        dispatch(setFilters(filters));
    }, [dispatch]);

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
                    commentsCount={originalCommentsCount}
                    repliesCount={repliesCount}
                    transcriptsCount={transcriptsCount}
                />
                <SearchBar onSearch={handleSearch} />
                <CommentList comments={filteredAndSortedComments} isLoading={isLoading} />
            </div>
        </div>
    );
};

export default App;
