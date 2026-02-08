import React from 'react';
import {
  ArrowsUpDownIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  HandThumbUpIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import RadioFilter from '../../shared/components/RadioFilter';
import useAnimation from '../../shared/hooks/useAnimation';
import { SortListProps } from '../../../types/filterTypes';
import { useTranslation } from 'react-i18next';

const SortList: React.FC<SortListProps> = ({ filters, setFilters }) => {
  const { t } = useTranslation();
  const { triggerAnimation, getAnimationClass } = useAnimation(1000);

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSortBy = e.target.value;
    const currentSortBy = filters.sortBy;

    if (newSortBy === currentSortBy) {
      setFilters({ ...filters, sortBy: '', sortOrder: '' });
    } else {
      const newSortOrder = filters.sortOrder;
      setFilters({ ...filters, sortBy: newSortBy, sortOrder: newSortOrder });
      triggerAnimation(newSortBy);
    }
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
      name: 'Likes',
      label: t('Likes'),
      icon: (
        <HandThumbUpIcon
          className={`hidden cq-[34rem]:inline-block w-4 h-4 mr-px ${getAnimationClass('likes', 'heartBeat')}`}
        />
      ),
      value: 'likes',
    },
    {
      name: 'Length',
      label: t('Word Count'),
      icon: (
        <DocumentTextIcon
          className={`hidden cq-[34rem]:inline-block w-4 h-4 mr-px ${getAnimationClass('length', 'flash')}`}
        />
      ),
      value: 'length',
    },
    {
      name: 'Replies',
      label: t('Replies'),
      icon: (
        <ChatBubbleLeftRightIcon
          className={`hidden cq-[34rem]:inline-block w-4 h-4 mr-px ${getAnimationClass('replies', 'bounceIn')}`}
        />
      ),
      value: 'replies',
    },
    {
      name: 'Date',
      label: t('Date'),
      icon: (
        <ClockIcon
          className={`hidden cq-[34rem]:inline-block w-4 h-4 mr-px ${getAnimationClass('date', 'swing')}`}
        />
      ),
      value: 'date',
    },
    {
      name: 'Author',
      label: t('Author'),
      icon: (
        <UsersIcon
          className={`hidden cq-[34rem]:inline-block w-4 h-4 mr-px ${getAnimationClass('author', 'rubberBand')}`}
        />
      ),
      value: 'author',
    },
    {
      name: 'Random',
      label: t('Random'),
      icon: (
        <ArrowsUpDownIcon
          className={`hidden cq-[34rem]:inline-block w-4 h-4 mr-px ${getAnimationClass('random', 'flip')}`}
        />
      ),
      value: 'random',
    },
  ];

  return (
    <div className="sort-list w-full grid grid-cols-2 gap-x-2 gap-y-1 cq-[40rem]:grid-cols-3 cq-[64rem]:grid-cols-6">
      {sortOptions.map((option) => (
        <div key={option.value} className="min-w-0">
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
  );
};

export default SortList;
