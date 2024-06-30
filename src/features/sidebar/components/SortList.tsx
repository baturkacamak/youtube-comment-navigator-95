import React, {useEffect, useRef, useState} from 'react';
import {
    AcademicCapIcon,
    ArrowsUpDownIcon,
    ArrowTrendingUpIcon,
    ChartBarIcon,
    ChatBubbleLeftRightIcon,
    ChevronDownIcon,
    ClockIcon,
    HandThumbUpIcon,
    ScaleIcon,
    UsersIcon
} from '@heroicons/react/24/outline';
import RadioFilter from '../../shared/components/RadioFilter';
import useAnimation from '../../shared/hooks/useAnimation';
import {SortListProps} from "../../../types/filterTypes";
import {useTranslation} from 'react-i18next';

const SortList: React.FC<SortListProps> = ({filters, setFilters}) => {
    const {t} = useTranslation();
    const {triggerAnimation, getAnimationClass} = useAnimation(1000);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [maxHeight, setMaxHeight] = useState('0px');
    const containerRef = useRef<HTMLDivElement>(null);

    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSortBy = e.target.value;
        const newSortOrder = filters.sortOrder;
        setFilters({...filters, sortBy: newSortBy, sortOrder: newSortOrder});
        triggerAnimation(newSortBy);
    };

    const toggleSortOrder = () => {
        const newSortOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
        setFilters({...filters, sortOrder: newSortOrder});
    };

    const handleRandomChange = () => {
        const newSortOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
        setFilters({...filters, sortBy: 'random', sortOrder: newSortOrder});
        triggerAnimation('random');
    };

    useEffect(() => {
        if (containerRef.current) {
            setMaxHeight(showAdvanced ? `${containerRef.current.scrollHeight}px` : '0px');
        }
    }, [showAdvanced]);

    const sortOptions = [
        {
            name: 'Likes',
            label: t('Likes'),
            icon: <HandThumbUpIcon className={`w-5 h-5 mr-px ${getAnimationClass('likes', 'heartBeat')}`}/>,
            value: 'likes'
        },
        {
            name: 'Length',
            label: t('Length'),
            icon: <ChartBarIcon className={`w-5 h-5 mr-px ${getAnimationClass('length', 'flash')}`}/>,
            value: 'length'
        },
        {
            name: 'Replies',
            label: t('Replies'),
            icon: <ChatBubbleLeftRightIcon className={`w-5 h-5 mr-px ${getAnimationClass('replies', 'bounceIn')}`}/>,
            value: 'replies'
        },
        {
            name: 'Date',
            label: t('Date'),
            icon: <ClockIcon className={`w-5 h-5 mr-px ${getAnimationClass('date', 'swing')}`}/>,
            value: 'date'
        },
        {
            name: 'Author',
            label: t('Author'),
            icon: <UsersIcon className={`w-5 h-5 mr-px ${getAnimationClass('author', 'rubberBand')}`}/>,
            value: 'author'
        },
        {
            name: 'Random',
            label: t('Random'),
            icon: <ArrowsUpDownIcon className={`w-5 h-5 mr-px ${getAnimationClass('random', 'flip')}`}/>,
            value: 'random'
        },
    ];

    const advancedSortOptions = [
        {
            name: 'Normalized',
            label: t('Normalized'),
            icon: <ScaleIcon className={`w-5 h-5 mr-px ${getAnimationClass('normalized', 'pulse')}`}/>,
            value: 'normalized'
        },
        {
            name: 'Weighted Z-Score',
            label: t('Weighted Z-Score'),
            icon: <ArrowTrendingUpIcon className={`w-5 h-5 mr-px ${getAnimationClass('zscore', 'pulse')}`}/>,
            value: 'zscore'
        },
        {
            name: 'Bayesian Average',
            label: t('Bayesian Average'),
            icon: <AcademicCapIcon className={`w-5 h-5 mr-px ${getAnimationClass('bayesian', 'pulse')}`}/>,
            value: 'bayesian'
        }
    ];

    return (
        <>
            <div className="flex gap-4">
                {sortOptions.map(option => (
                    <div key={option.value}>
                        <RadioFilter
                            name={option.name}
                            label={option.label}
                            icon={option.icon}
                            value={option.value}
                            selectedValue={filters.sortBy}
                            sortOrder={filters.sortOrder}
                            isRandom={option.value === 'random'}
                            onChange={option.value === 'random' ? handleRandomChange : handleRadioChange}
                            onToggleSortOrder={option.value === 'random' ? handleRandomChange : toggleSortOrder}
                            aria-label={t(`Sort By`) + option.label}
                        />
                    </div>
                ))}
            </div>
            <div className="inline-flex ml-auto">
                <button onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center text-blue-500 hover:underline">
                    {t('Advanced Sort Options')}
                    <ChevronDownIcon
                        className={`w-5 h-5 ml-1 transform transition-transform duration-500 ${showAdvanced ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                    />
                </button>
            </div>
            <div ref={containerRef} style={{maxHeight}}
                 className={`flex w-full ml-10 gap-4 transition-all duration-500 ${showAdvanced ? 'my-2 opacity-1' : 'm-0 opacity-0'}`}>
                {advancedSortOptions.map(option => (
                    <div key={option.value}>
                        <RadioFilter
                            name={option.name}
                            label={option.label}
                            icon={option.icon}
                            value={option.value}
                            selectedValue={filters.sortBy}
                            sortOrder={filters.sortOrder}
                            onChange={handleRadioChange}
                            onToggleSortOrder={toggleSortOrder}
                            aria-label={t(`Sort By`) + option.label}
                        />
                    </div>
                ))}
            </div>
        </>
    );
};

export default SortList;
