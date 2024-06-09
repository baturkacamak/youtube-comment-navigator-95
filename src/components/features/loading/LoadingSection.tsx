import React from 'react';
import {
    ChatBubbleOvalLeftIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    InboxIcon
} from '@heroicons/react/24/outline';
import Box from "../../common/Box";
import Button from "../../common/Button";
import { LoadingSectionProps } from "../../../types/layoutTypes";

const LoadingSection: React.FC<LoadingSectionProps> = ({
                                                           onLoadComments, onLoadChat, onLoadTranscript, onLoadAll,
                                                           commentsCount, repliesCount, transcriptsCount
                                                       }) => {
    return (
        <Box className="p-1 bg-gradient-to-r from-teal-100 to-teal-300 dark:bg-gradient-to-r dark:from-teal-700 dark:to-teal-900 rounded-lg shadow-md">
            <div className="flex items-center justify-between space-x-4">
                <Button
                    onClick={() => onLoadComments(true)}
                    icon={ChatBubbleOvalLeftIcon}
                    label={`Load Comments (${commentsCount})`}
                    className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-full py-1 px-2 text-xs"
                />
                <Button
                    onClick={onLoadChat}
                    icon={InboxIcon}
                    label={`Load Chat (${repliesCount})`}
                    className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-full py-1 px-2 text-xs"
                />
                <Button
                    onClick={onLoadTranscript}
                    icon={DocumentTextIcon}
                    label={`Load Transcript (${transcriptsCount})`}
                    className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-full py-1 px-2 text-xs"
                />
                <Button
                    onClick={() => onLoadAll(true)}
                    icon={ClipboardDocumentListIcon}
                    label="Load All"
                    className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-full py-1 px-2 text-xs"
                />
            </div>
        </Box>
    );
};

export default LoadingSection;
