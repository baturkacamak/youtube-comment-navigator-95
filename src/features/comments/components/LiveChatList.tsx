import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import { setLiveChat } from '../../../store/store';
import { db } from '../../shared/utils/database/database';
import { extractVideoId } from '../services/remote/utils';
import { loadPagedComments } from '../services/pagination';
import CommentItem from './CommentItem';
import { Comment } from '../../../types/commentTypes';
import { PAGINATION } from '../../shared/utils/appConstants';
import logger from '../../shared/utils/logger';

const LiveChatList: React.FC = () => {
    const dispatch = useDispatch();
    const liveChatComments = useSelector((state: RootState) => state.liveChat);
    const [isLoading, setIsLoading] = useState(true);
    
    // We can implement pagination for live chat later, for now load a batch
    // or rely on a "load more" button if we want to support it.
    // Given live chat can be huge, we should definitely page it.
    
    const [page, setPage] = useState(0);
    const pageSize = 100; // Larger page size for chat

    const fetchLiveChat = async () => {
        const videoId = extractVideoId();
        if (!videoId) return;
        logger.info('Fetching live chat for videoId:', videoId);
        try {
            const chats = await loadPagedComments(
                db.comments,
                videoId,
                page,
                pageSize,
                'date',
                'asc', 
                {},
                '',
                { onlyLiveChat: true }
            );
            
            dispatch(setLiveChat(chats));
        } catch (error) {
            logger.error('Error fetching live chat:', error);
        } finally {
            setIsLoading(false);
        }
    };
    logger.info('LiveChatList component mounted');
    useEffect(() => {
        fetchLiveChat();
        const intervalId = setInterval(fetchLiveChat, 2000);
        return () => clearInterval(intervalId);
    }, [dispatch, page]);

    return (
        <div className="flex flex-col gap-2">
            {liveChatComments.length === 0 && !isLoading && (
                <div className="text-center p-4 text-gray-500">
                    No live chat replay available or loading...
                </div>
            )}
            
            {liveChatComments.map((comment: Comment) => (
                <CommentItem
                    key={comment.commentId}
                    comment={comment}
                />
            ))}
            
            {isLoading && (
                <div className="text-center p-4">Loading chat...</div>
            )}
        </div>
    );
};

export default LiveChatList;
