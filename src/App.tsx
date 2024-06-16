import React, {useState} from 'react';
import SettingsDrawer from './features/settings/components/SettingsDrawer';
import ControlPanel from './features/sidebar/components/ControlPanel';
import SearchBar from './features/search/components/SearchBar';
import CommentList from './features/comments/components/CommentList';
import BookmarkedComments from './features/comments/components/BookmarkedComments';
import useAppState from './features/shared/hooks/useAppState';
import useHandleUrlChange from "./features/shared/hooks/useHandleUrlChange";
import './styles/App.scss';
import { AnimatePresence, motion } from 'framer-motion';

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
        repliesCount,
        transcriptsCount,
        setFiltersCallback,
        showBookmarked, // Get this from the hook
        toggleShowBookmarked, // Get this from the hook
    } = useAppState();

    useHandleUrlChange();

    return (
        <div className="relative flex overflow-hidden">
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
                    repliesCount={repliesCount}
                    transcriptsCount={transcriptsCount}
                    openSettings={openSettings}
                    toggleBookmarkedComments={toggleShowBookmarked} // Use the toggle function from the hook
                    showBookmarkedComments={showBookmarked} // Use the state from the hook
                />
                <SearchBar onSearch={handleSearch} />
                <AnimatePresence mode={"wait"}>
                    {showBookmarked ? (
                        <motion.div
                            key="bookmarked"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <BookmarkedComments />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="comments"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <CommentList comments={filteredAndSortedComments} isLoading={isLoading} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default App;
