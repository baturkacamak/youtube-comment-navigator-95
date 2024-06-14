import React from 'react';
import { ClockIcon, GiftIcon, HeartIcon, LinkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import CheckboxFilter from '../../common/CheckboxFilter';
import useAnimation from '../../../hooks/useAnimation';
import { FilterListProps } from "../../../types/filterTypes";
import { useTranslation } from 'react-i18next';

const FilterList: React.FC<FilterListProps> = ({ filters, setFilters }) => {
    const { t } = useTranslation();
    const { triggerAnimation, getAnimationClass } = useAnimation(1000);

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFilters({ ...filters, [name]: checked });
        triggerAnimation(name);
    };

    const filterOptions = [
        { name: t('Timestamps'), icon: <ClockIcon className={`w-5 h-5 mr-2 ${getAnimationClass('timestamps', 'swing')}`} /> },
        { name: t('Heart'), icon: <HeartIcon className={`w-5 h-5 mr-2 ${getAnimationClass('heart', 'heartBeat')}`} /> },
        { name: t('Links'), icon: <LinkIcon className={`w-5 h-5 mr-2 ${getAnimationClass('links', 'flash')}`} /> },
        { name: t('Members'), icon: <UserGroupIcon className={`w-5 h-5 mr-2 ${getAnimationClass('members', 'rubberBand')}`} /> },
        { name: t('Donated'), icon: <GiftIcon className={`w-5 h-5 mr-2 ${getAnimationClass('donated', 'bounceIn')}`} /> },
    ];

    return (
        <>
            {filterOptions.map(option => (
                <div key={option.name}>
                    <CheckboxFilter
                        name={option.name}
                        icon={option.icon}
                        value={option.name}
                        checked={filters[option.name]}
                        onChange={handleCheckboxChange}
                        aria-label={t(`Filter by ${option.name}`)}
                    />
                </div>
            ))}
        </>
    );
};

export default FilterList;
