import React from 'react';
import { useSelector } from 'react-redux';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import Button from '../../shared/components/Button';
import SettingsButton from '../../shared/components/SettingsButton';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../types/rootState';
import { motion, AnimatePresence } from 'framer-motion';

interface NavigationHeaderProps {
    openSettings: () => void;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
                                                               openSettings,
                                                           }) => {
    const { t } = useTranslation();

    // Get the bookmark count from the Redux state
    const bookmarkCount = useSelector((state: RootState) => state.bookmarkedComments.length);

    return (
        <div className="flex items-center justify-between">
            <SettingsButton onClick={openSettings} aria-label={t('Open settings')} />
            <h3 className="text-lg font-bold text-teal-800 dark:text-teal-200" aria-label={t('YouTube Comment Navigator 95')}>
                {t('YouTube Comment Navigator 95')}
            </h3>
        </div>
    );
};

export default NavigationHeader;
