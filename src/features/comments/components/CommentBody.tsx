import React from 'react';
import { parseTimestamps } from '../../shared/utils/parseTimestamps';
import { highlightText } from '../../shared/utils/highlightText';
import { splitTextByNewlines } from '../utils/formatting/splitTextByNewlines';
import { CommentContentProps } from "../../../types/commentTypes";
import { useSelector } from 'react-redux';
import { RootState } from "../../../types/rootState";

const CommentBody: React.FC<CommentContentProps> = ({ content, handleTimestampClick }) => {
    const keyword = useSelector((state: RootState) => state.filters.keyword);
    const textSize = useSelector((state: RootState) => state.settings.textSize);
    const fontFamily = useSelector((state: RootState) => state.settings.fontFamily); // Get the selected font

    const splitText = splitTextByNewlines(content);
    const timestampedText = parseTimestamps({content: splitText, handleTimestampClick});
    const highlightedText = highlightText(timestampedText, keyword);

    return (
        <p
            className={`${textSize} mb-2 transition-all duration-300 ease-in-out`}
            style={{ fontFamily }}
            aria-live="polite"
        >
            {highlightedText}
        </p>
    );
};

export default CommentBody;
