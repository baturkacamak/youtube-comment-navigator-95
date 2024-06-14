import React from 'react';
import {
    ArrowsUpDownIcon,
    ChartBarIcon,
    ChatBubbleLeftRightIcon,
    ClockIcon,
    HandThumbUpIcon,
    UserIcon
} from '@heroicons/react/24/outline';
import RadioFilter from '../../shared/components/RadioFilter';
import useAnimation from '../../shared/hooks/useAnimation';
import { SortListProps } from "../../../types/filterTypes";
import { useTranslation } from 'react-i18next';

const SortList: React.FC<SortListProps> = ({ filters, setFilters }) => {
    const { t } = useTranslation();
    const { triggerAnimation, getAnimationClass } = useAnimation(1000);

    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSortBy = e.target.value;
        const newSortOrder = filters.sortOrder;
        setFilters({ ...filters, sortBy: newSortBy, sortOrder: newSortOrder });
        triggerAnimation(newSortBy);
    };

    const toggleSortOrder = () => {
        const newSortOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
        setFilters({ ...filters, sortOrder: newSortOrder });
    };

    const handleRandomChange = () => {
        const newSortOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
        setFilters({ ...filters, sortBy: 'random', sortOrder: newSortOrder });
        triggerAnimation('random');
    };

    const sortOptions = [
        {
            name: t('Likes'),
            icon: <HandThumbUpIcon className={`w-5 h-5 mr-2 ${getAnimationClass('likes', 'heartBeat')}`} />,
            value: 'likes'
        },
        {
            name: t('Length'),
            icon: <ChartBarIcon className={`w-5 h-5 mr-2 ${getAnimationClass('length', 'flash')}`} />,
            value: 'length'
        },
        {
            name: t('Replies'),
            icon: <ChatBubbleLeftRightIcon className={`w-5 h-5 mr-2 ${getAnimationClass('replies', 'bounceIn')}`} />,
            value: 'replies'
        },
        {
            name: t('Date'),
            icon: <ClockIcon className={`w-5 h-5 mr-2 ${getAnimationClass('date', 'swing')}`} />,
            value: 'date'
        },
        {
            name: t('Author'),
            icon: <UserIcon className={`w-5 h-5 mr-2 ${getAnimationClass('author', 'rubberBand')}`} />,
            value: 'author'
        },
        {
            name: t('Random'),
            icon: <ArrowsUpDownIcon className={`w-5 h-5 mr-2 ${getAnimationClass('random', 'flip')}`} />,
            value: 'random'
        },
    ];

    return (
        <>
            {sortOptions.map(option => (
                <div key={option.value}>
                    <RadioFilter
                        name={option.name}
                        icon={option.icon}
                        value={option.value}
                        selectedValue={filters.sortBy}
                        sortOrder={filters.sortOrder}
                        isRandom={option.value === 'random'}
                        onChange={option.value === 'random' ? handleRandomChange : handleRadioChange}
                        onToggleSortOrder={option.value === 'random' ? handleRandomChange : toggleSortOrder}
                        aria-label={t(`Sort by ${option.name}`)}
                    />
                </div>
            ))}
        </>
    );
};

export default SortList;
