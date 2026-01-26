import React from 'react';
import {
    ChatBubbleOvalLeftIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    InboxIcon,
    ChatBubbleLeftRightIcon,
    RocketLaunchIcon
} from '@heroicons/react/24/outline';
import Button from "../../shared/components/Button";
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import useLoadContent from "../../shared/hooks/useLoadContent";

const LoadingSection = () => {
    const { loadComments, loadTranscript, loadLiveChat, loadAll } = useLoadContent();

    const { t } = useTranslation();
    // Use totalCommentsCount from IndexedDB (via Redux sync) instead of in-memory array length
    const commentsCount = useSelector((state: RootState) => state.totalCommentsCount);
    const liveChatCount = useSelector((state: RootState) => state.liveChatMessageCount);

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
            <Button
                onClick={loadLiveChat}
                icon={ChatBubbleLeftRightIcon}
                label={t('Load Live Chat')}
                className="bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-full py-1 px-2 text-xs"
                aria-label={t('Load Live Chat ({{count}})', { count: liveChatCount })}
            />
            <Button
                onClick={loadAll}
                icon={RocketLaunchIcon}
                label={t('Load All')}
                className="bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white rounded-full py-1 px-2 text-xs"
                aria-label={t('Load All (Comments, Transcript, Live Chat)')}
            />
        </div>
    );
};

export default LoadingSection;
