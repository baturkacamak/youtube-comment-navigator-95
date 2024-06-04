// src/components/features/sidebar/FilterList.tsx

import React from 'react';
import {ClockIcon, GiftIcon, HeartIcon, LinkIcon, UserGroupIcon} from '@heroicons/react/24/outline';
import CheckboxFilter from '../../common/CheckboxFilter';
import useAnimation from '../../../hooks/useAnimation';

import {FilterListProps} from "../../../types/filterTypes";

const FilterList: React.FC<FilterListProps> = ({ filters, setFilters }) => {
    const { triggerAnimation, getAnimationClass } = useAnimation(1000);

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFilters({ ...filters, [name]: checked });
        triggerAnimation(name);
    };

    const filterOptions = [
        { name: 'timestamps', icon: <ClockIcon className={`w-5 h-5 mr-2 ${getAnimationClass('timestamps', 'swing')}`} /> },
        { name: 'heart', icon: <HeartIcon className={`w-5 h-5 mr-2 ${getAnimationClass('heart', 'heartBeat')}`} /> },
        { name: 'links', icon: <LinkIcon className={`w-5 h-5 mr-2 ${getAnimationClass('links', 'flash')}`} /> },
        { name: 'members', icon: <UserGroupIcon className={`w-5 h-5 mr-2 ${getAnimationClass('members', 'rubberBand')}`} /> },
        { name: 'donated', icon: <GiftIcon className={`w-5 h-5 mr-2 ${getAnimationClass('donated', 'bounceIn')}`} /> },
    ];

    return (
        <div className="mb-2">
            {filterOptions.map(option => (
                <CheckboxFilter
                    key={option.name}
                    name={option.name}
                    icon={option.icon}
                    value={option.name}
                    checked={filters[option.name]}
                    onChange={handleCheckboxChange}
                />
            ))}
        </div>
    );
};

export default FilterList;
