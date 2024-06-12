import React from 'react';
import { parseTimestamps } from '../../../../utils/parseTimestamps';
import { highlightText } from '../../../../utils/highlightText';
import { linkifyText } from '../../../../utils/linkifyText';
import { CommentContentProps } from "../../../../types/commentTypes";
import { useSelector } from 'react-redux';
import { RootState } from "../../../../types/rootState";

const CommentBody: React.FC<CommentContentProps> = ({ content, handleTimestampClick }) => {
    const keyword = useSelector((state: RootState) => state.filters.keyword);
    const textSize = useSelector((state: RootState) => state.textSize);

    const linkedText = linkifyText(content);
    const timestampedText = parseTimestamps(linkedText, handleTimestampClick);
    const highlightedText = highlightText(timestampedText, keyword);

    return (
        <p className={`${textSize} mb-2`}>
            {highlightedText}
        </p>
    );
};

export default CommentBody;
