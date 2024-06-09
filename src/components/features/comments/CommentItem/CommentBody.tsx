import React from 'react';
import { parseTimestamps } from '../../../../utils/parseTimestamps';
import { highlightText } from '../../../../utils/highlightText';
import { CommentContentProps } from "../../../../types/commentTypes";
import { useSelector } from 'react-redux';
import { RootState } from "../../../../types/rootState";
import {linkifyText} from "../../../../utils/linkifyText";


const CommentBody: React.FC<CommentContentProps> = ({ content, handleTimestampClick }) => {
    const keyword = useSelector((state: RootState) => state.filters.keyword);

    return (
        <p className="text-xl mb-2">
            {highlightText(parseTimestamps(linkifyText(content), handleTimestampClick), keyword)}
        </p>
    );
};

export default CommentBody;
