// src/components/features/comments/CommentItem/CommentContent.tsx

import React from 'react';
import {parseTimestamps} from '../../../../utils/parseTimestamps';

import {CommentContentProps} from "../../../../types/commentTypes";

const CommentContent: React.FC<CommentContentProps> = ({ content, handleTimestampClick }) => {
    return <p className="text-gray-800 dark:text-gray-200 mb-4">{parseTimestamps(content, handleTimestampClick)}</p>;
};

export default CommentContent;
