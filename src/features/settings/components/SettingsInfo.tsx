import React from 'react';
import { InformationCircleIcon, EnvelopeIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { AiFillGithub } from 'react-icons/ai'; // Importing the GitHub icon
import packageJson from '../../../../package.json';

const SettingsInfo: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-4 space-y-2">
            <hr className="mb-4" />
            <p className="flex items-center">
                <InformationCircleIcon className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" />
                {t('App Version')}: <strong className="ml-1">{packageJson.version}</strong>
            </p>
            <p className="flex items-center">
                <UserCircleIcon className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" />
                {t('Developed by')} <strong className="ml-1">Batur Kacamak</strong>
            </p>
            <p className="flex items-center">
                <AiFillGithub className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" />
                <a href="https://github.com/baturkacamak/youtube-comment-navigator-95" className="text-teal-600 dark:text-teal-400">{t('GitHub Repository')}</a>
            </p>
            <p className="flex items-center">
                <EnvelopeIcon className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" />
                {t('Contact')}: <a href="mailto:hello@batur.info" className="text-teal-600 dark:text-teal-400 ml-1">hello@batur.info</a>
            </p>
        </div>
    );
};

export default SettingsInfo;
