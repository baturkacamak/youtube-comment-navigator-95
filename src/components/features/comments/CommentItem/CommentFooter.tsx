import React from 'react';
import {
    BanknotesIcon,
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ClipboardIcon,
    ClockIcon,
    HandThumbUpIcon,
    HeartIcon,
    LinkIcon
} from '@heroicons/react/24/outline';

import { CommentActionsProps } from "../../../../types/commentTypes";
import { extractYouTubeVideoIdFromUrl } from "../../../../utils/extractYouTubeVideoIdFromUrl";
import Tooltip from "../../../common/Tooltip";

const CommentFooter: React.FC<CommentActionsProps> = ({
                                                          comment,
                                                          commentId,
                                                          replyCount,
                                                          showReplies,
                                                          setShowReplies,
                                                          handleCopyToClipboard,
                                                          copySuccess
                                                      }) => {

    const videoId = extractYouTubeVideoIdFromUrl();

    return (
        <div className="flex items-center justify-between space-x-2 mt-2">
            <div className="flex items-center gap-6 text-gray-600 dark:text-gray-400">
                <div className="flex items-center" aria-hidden="true">
                    <HandThumbUpIcon className="w-4 h-4 mr-1"/>
                    <span className="text-sm">{comment.likes}</span>
                </div>
                <div className="flex items-center" aria-hidden="true">
                    <ClockIcon className="w-4 h-4 mr-1"/>
                    <span className="text-sm">{comment.published}</span>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <button
                    onClick={handleCopyToClipboard}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
                    title="Copy to clipboard"
                >
                    {copySuccess ? (
                        <>
                            <CheckCircleIcon className="w-4 h-4 mr-1 text-green-500 animate-pulse" aria-hidden="true"/>
                            <span className="text-sm">Copied</span>
                        </>
                    ) : (
                        <>
                            <ClipboardIcon className="w-4 h-4 mr-1" aria-hidden="true"/>
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
                    <LinkIcon className="w-4 h-4 mr-1" aria-hidden="true"/>
                    <span className="text-sm">Original</span>
                </a>
                {replyCount > 0 && (
                    <button
                        onClick={() => setShowReplies(!showReplies)}
                        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
                        title={showReplies ? "Hide replies" : "Show replies"}
                    >
                        <ChevronDownIcon
                            className={`w-4 h-4 mr-1 transform transition-transform duration-300 ${showReplies ? "rotate-180" : "rotate-0"}`}
                            aria-hidden="true"
                        />
                        <span className="text-sm">{showReplies ? "Hide replies" : `Show replies`} ({replyCount})</span>
                    </button>
                )}
            </div>
            <div className="flex items-center gap-4">
                <a href={`https://www.youtube.com/channel/${comment.authorChannelId}`} target="_blank"
                   rel="noopener noreferrer" className="flex items-center">
                    <img
                        src={comment.authorAvatarUrl}
                        alt={`${comment.author}'s avatar`}
                        className="w-8 h-8 rounded-full border border-gray-400 dark:border-gray-600"
                    />
                    <span className="ml-2 text-md font-bold text-gray-800 dark:text-gray-200">
                        {comment.author}
                    </span>
                </a>
                {comment.isAuthorContentCreator && (
                    <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">Creator</span>
                )}
                {comment.isDonated && (
                    <span className="ml-2 flex items-center text-green-600">
                        <BanknotesIcon className="w-4 h-4 mr-1" aria-hidden="true"/>
                        {comment.donationAmount}
                    </span>
                )}
                {comment.isHearted && (
                    <Tooltip text="Hearted by Creator">
                        <span className="ml-2 flex items-center text-red-600 animate-pulse bg-red-100 rounded-full p-1">
                            <HeartIcon className="w-4 h-4" aria-hidden="true"/>
                        </span>
                    </Tooltip>
                )}
                {comment.isMember && (
                    <Tooltip text={`${comment.authorMemberSince}`}>
                        <img src={comment.authorBadgeUrl} alt="Member Badge" className="ml-2 w-4 h-4"/>
                    </Tooltip>
                )}
            </div>
        </div>
    );
};

export default CommentFooter;