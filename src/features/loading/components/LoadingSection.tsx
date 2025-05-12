import React from 'react';
import {
    ChatBubbleOvalLeftIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    InboxIcon
} from '@heroicons/react/24/outline';
import Button from "../../shared/components/Button";
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import useLoadContent from "../../shared/hooks/useLoadContent";

const LoadingSection = () => {
    const { loadComments, loadTranscript } = useLoadContent();

    const { t } = useTranslation();
    const commentsCount = useSelector((state: RootState) => state.comments.length);

    return (
        <div className="grid grid-cols-2 gap-2" aria-label={t('Loading Section')}>
            <Button
                onClick={() => loadComments(true)}
                icon={ChatBubbleOvalLeftIcon}
                label={t('Load Comments')}
                className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-full py-1 px-2 text-xs"
                aria-label={t('Load Comments ({{count}})', { count: commentsCount })}
            />
            <Button
                onClick={loadTranscript}
                icon={DocumentTextIcon}
                label={t('Load Transcript')}
                className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-full py-1 px-2 text-xs"
                aria-label={t('Load Transcript')}
            />
        </div>
    );
};

export default LoadingSection;
