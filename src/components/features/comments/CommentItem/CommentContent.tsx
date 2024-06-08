import React from 'react';
import { parseTimestamps } from '../../../../utils/parseTimestamps';
import { highlightText } from '../../../../utils/highlightText';
import { CommentContentProps } from "../../../../types/commentTypes";
import { useSelector } from 'react-redux';
import { RootState } from "../../../../types/rootState";

const CommentContent: React.FC<CommentContentProps> = ({ content, handleTimestampClick }) => {
    const keyword = useSelector((state: RootState) => state.filters.keyword);

    return (
        <p className="text-gray-800 dark:text-gray-200 mb-4">
            {highlightText(parseTimestamps(content, handleTimestampClick), keyword)}
        </p>
    );
};

export default CommentContent;
