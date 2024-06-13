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
import { useTranslation } from 'react-i18next';

const LoadingSection: React.FC<LoadingSectionProps> = ({
                                                           onLoadComments, onLoadChat, onLoadTranscript, onLoadAll,
                                                           commentsCount, repliesCount, transcriptsCount
                                                       }) => {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-2 gap-2" aria-label={t('Loading Section')}>
            <Button
                onClick={() => onLoadComments(true)}
                icon={ChatBubbleOvalLeftIcon}
                label={t('Load Comments', { count: commentsCount })}
                className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-full py-1 px-2 text-xs"
                aria-label={t('Load Comments', { count: commentsCount })}
            />
            <Button
                onClick={onLoadChat}
                icon={InboxIcon}
                label={t('Load Chat', { count: repliesCount })}
                className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-full py-1 px-2 text-xs"
                aria-label={t('Load Chat', { count: repliesCount })}
            />
            <Button
                onClick={onLoadTranscript}
                icon={DocumentTextIcon}
                label={t('Load Transcript', { count: transcriptsCount })}
                className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-full py-1 px-2 text-xs"
                aria-label={t('Load Transcript', { count: transcriptsCount })}
            />
            <Button
                onClick={() => onLoadAll(true)}
                icon={ClipboardDocumentListIcon}
                label={t('Load All')}
                className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-full py-1 px-2 text-xs"
                aria-label={t('Load All')}
            />
        </div>
    );
};

export default LoadingSection;
