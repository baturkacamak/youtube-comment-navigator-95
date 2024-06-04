import React from 'react';
import {
    BanknotesIcon,
    ChatBubbleLeftRightIcon,
    ClockIcon,
    HandThumbUpIcon,
    HeartIcon
} from '@heroicons/react/24/outline';
import Tooltip from '../../../common/Tooltip';

import {CommentHeaderProps} from "../../../../types/commentTypes";

const CommentHeader: React.FC<CommentHeaderProps> = ({ comment }) => {
    return (
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
                <a href={`https://www.youtube.com/channel/${comment.authorChannelId}`} target="_blank"
                   rel="noopener noreferrer" className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {comment.author}
                </a>
                {comment.isAuthorContentCreator && (
                    <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">Creator</span>
                )}
                {comment.isDonated && (
                    <span className="ml-2 flex items-center text-green-600">
                        <BanknotesIcon className="w-5 h-5 mr-1" aria-hidden="true" />
                        {comment.donationAmount}
                    </span>
                )}
                {comment.isHearted && (
                    <Tooltip text="Hearted by Creator">
                        <span className="ml-2 flex items-center text-red-600 animate-pulse bg-red-100 rounded-full p-1">
                            <HeartIcon className="w-5 h-5" aria-hidden="true" />
                        </span>
                    </Tooltip>
                )}
                {comment.isMember && (
                    <Tooltip text={`${comment.authorMemberSince}`}>
                        <img src={comment.authorBadgeUrl} alt="Member Badge" className="ml-2 w-5 h-5" />
                    </Tooltip>
                )}
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
                <div className="flex items-center mr-4" aria-hidden="true">
                    <HandThumbUpIcon className="w-5 h-5 mr-1"/>
                    <span className="text-sm">{comment.likes}</span>
                </div>
                <div className="flex items-center mr-4" aria-hidden="true">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-1"/>
                    <span className="text-sm">{comment.replyCount}</span>
                </div>
                <div className="flex items-center" aria-hidden="true">
                    <ClockIcon className="w-5 h-5 mr-1"/>
                    <span className="text-sm">{comment.published}</span>
                </div>
            </div>
        </div>
    );
};

export default CommentHeader;
