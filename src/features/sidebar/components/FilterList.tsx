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
      icon: (
        <ClockIcon
          className={`inline-block w-4 h-4 mr-1 ${getAnimationClass('timestamps', 'swing')}`}
        />
      ),
    },
    {
      name: 'heart',
      label: t('Heart'),
      icon: (
        <HeartIcon
          className={`inline-block w-4 h-4 mr-1 ${getAnimationClass('heart', 'heartBeat')}`}
        />
      ),
    },
    {
      name: 'links',
      label: t('Links'),
      icon: (
        <LinkIcon className={`inline-block w-4 h-4 mr-1 ${getAnimationClass('links', 'flash')}`} />
      ),
    },
    {
      name: 'members',
      label: t('Members'),
      icon: (
        <UserGroupIcon
          className={`inline-block w-4 h-4 mr-1 ${getAnimationClass('members', 'rubberBand')}`}
        />
      ),
    },
    {
      name: 'donated',
      label: t('Donated'),
      icon: (
        <GiftIcon
          className={`inline-block w-4 h-4 mr-1 ${getAnimationClass('donated', 'bounceIn')}`}
        />
      ),
    },
    {
      name: 'creator',
      label: t('Creator'),
      icon: (
        <UserIcon
          className={`inline-block w-4 h-4 mr-1 ${getAnimationClass('creator', 'jello')}`}
        />
      ),
    },
  ];

  return (
    <div className="filter-list w-full flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 cq-[56rem]:grid cq-[56rem]:grid-cols-3 cq-[72rem]:grid-cols-6 cq-[56rem]:gap-x-2 cq-[56rem]:gap-y-1 cq-[56rem]:overflow-visible cq-[56rem]:pb-0">
      {filterOptions.map((option) => (
        <div key={option.name} className="min-w-0 shrink-0 cq-[56rem]:shrink">
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
    </div>
  );
};

export default FilterList;
