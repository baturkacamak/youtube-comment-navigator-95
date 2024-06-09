import React from 'react';
import {CheckCircleIcon, ChevronDownIcon, ClipboardIcon, LinkIcon} from '@heroicons/react/24/outline';

import {CommentActionsProps} from "../../../../types/commentTypes";
import {extractYouTubeVideoIdFromUrl} from "../../../../utils/extractYouTubeVideoIdFromUrl";

const CommentFooter: React.FC<CommentActionsProps> = ({
                                                           commentId,
                                                           replyCount,
                                                           showReplies,
                                                           setShowReplies,
                                                           handleCopyToClipboard,
                                                           copySuccess
                                                       }) => {

    const videoId = extractYouTubeVideoIdFromUrl();

    return (
        <div className="flex items-center justify-end space-x-4">
            <button
                onClick={handleCopyToClipboard}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
                title="Copy to clipboard"
            >
                {copySuccess ? (
                    <>
                        <CheckCircleIcon className="w-5 h-5 mr-1 text-green-500 animate-pulse" aria-hidden="true"/>
                        <span className="text-sm">Copied</span>
                    </>
                ) : (
                    <>
                        <ClipboardIcon className="w-5 h-5 mr-1" aria-hidden="true"/>
                        <span className="text-sm">Copy</span>
                    </>
                )}
            </button>
            <a
                href={`https://www.youtube.com/watch?v=${videoId}&lc=${commentId}`} // Replace VIDEO_ID with the actual video ID if available
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                title="Go to original comment"
            >
                <LinkIcon className="w-5 h-5 mr-1" aria-hidden="true"/>
                <span className="text-sm">Original</span>
            </a>
            {replyCount > 0 && (
                <button
                    onClick={() => setShowReplies(!showReplies)}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
                    title={showReplies ? "Hide replies" : "Show replies"}
                >
                    <ChevronDownIcon
                        className={`w-5 h-5 mr-1 transform transition-transform duration-300 ${showReplies ? "rotate-180" : "rotate-0"}`}
                        aria-hidden="true"
                    />
                    <span className="text-sm">{showReplies ? "Hide replies" : `Show replies`} ({replyCount})</span>
                </button>
            )}
        </div>
    );
};

export default CommentFooter;
