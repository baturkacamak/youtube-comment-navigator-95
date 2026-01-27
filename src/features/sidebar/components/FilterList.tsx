import React from 'react';
import {
  ClockIcon,
  GiftIcon,
  HeartIcon,
  LinkIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import CheckboxFilter from '../../shared/components/CheckboxFilter';
import useAnimation from '../../shared/hooks/useAnimation';
import { FilterListProps } from '../../../types/filterTypes';
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
    {
      name: 'timestamps',
      label: t('Timestamps'),
      icon: <ClockIcon className={`w-5 h-5 mr-2 ${getAnimationClass('timestamps', 'swing')}`} />,
    },
    {
      name: 'heart',
      label: t('Heart'),
      icon: <HeartIcon className={`w-5 h-5 mr-2 ${getAnimationClass('heart', 'heartBeat')}`} />,
    },
    {
      name: 'links',
      label: t('Links'),
      icon: <LinkIcon className={`w-5 h-5 mr-2 ${getAnimationClass('links', 'flash')}`} />,
    },
    {
      name: 'members',
      label: t('Members'),
      icon: (
        <UserGroupIcon className={`w-5 h-5 mr-2 ${getAnimationClass('members', 'rubberBand')}`} />
      ),
    },
    {
      name: 'donated',
      label: t('Donated'),
      icon: <GiftIcon className={`w-5 h-5 mr-2 ${getAnimationClass('donated', 'bounceIn')}`} />,
    },
    {
      name: 'creator',
      label: t('Creator'),
      icon: <UserIcon className={`w-5 h-5 mr-2 ${getAnimationClass('creator', 'jello')}`} />,
    },
  ];

  return (
    <>
      {filterOptions.map((option) => (
        <div key={option.name}>
          <CheckboxFilter
            name={option.label}
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
