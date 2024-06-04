import React from 'react';
import {
    ChatBubbleOvalLeftIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    InboxIcon
} from '@heroicons/react/24/outline';
import Button from '../../common/Button';
import Box from "../../common/Box";

import {LoadingSectionProps} from "../../../types/layoutTypes";

const LoadingSection: React.FC<LoadingSectionProps> = ({
                                                           onLoadComments, onLoadChat, onLoadTranscript, onLoadAll,
                                                           commentsCount, repliesCount, transcriptsCount
                                                       }) => {
    return (
        <Box className="mb-4">
            <div className="flex items-center justify-around mb-4">
                <Button onClick={() => onLoadComments(true)} icon={ChatBubbleOvalLeftIcon} label="Load Comments"
                        className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white"/>
                <Button onClick={onLoadChat} icon={InboxIcon} label="Load Chat Replies"
                        className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white"/>
                <Button onClick={onLoadTranscript} icon={DocumentTextIcon} label="Load Transcript"
                        className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white"/>
                <Button onClick={() => onLoadAll(true)} icon={ClipboardDocumentListIcon} label="Load All"
                        className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white"/>
            </div>
            <div className="flex items-center justify-around text-gray-800 dark:text-gray-200 text-sm">
                <span>Comments Loaded: {commentsCount}</span>
                <span>Chat Replies Loaded: {repliesCount}</span>
                <span>Transcripts Loaded: {transcriptsCount}</span>
            </div>
        </Box>
    );
};

export default LoadingSection;
