import React, { useEffect } from 'react';
import {
  AdjustmentsHorizontalIcon,
  ArrowsPointingInIcon,
  ArrowsUpDownIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';
import SelectBox from '../../shared/components/SelectBox/SelectBox';
import { Option } from '../../../types/utilityTypes';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import { getSettings } from '../utils/settingsUtils';
import { setTextSize } from '../../../store/store';

const TextSizeSetting: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const textSize = useSelector((state: RootState) => state.settings.textSize);

  const textSizeOptions: Option[] = [
    { value: 'text-sm', label: t('Small'), icon: AdjustmentsHorizontalIcon },
    { value: 'text-base', label: t('Medium'), icon: ArrowsPointingInIcon },
    { value: 'text-lg', label: t('Large'), icon: ArrowsUpDownIcon },
    { value: 'text-xl', label: t('Extra Large'), icon: ArrowsPointingOutIcon },
  ];

  useEffect(() => {
    try {
      const settings = getSettings();
      const textSizeValue = settings.textSize || 'text-base';

      // Validate text size value
      const validSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl'];
      const sanitizedSize = validSizes.includes(textSizeValue) ? textSizeValue : 'text-base';

      dispatch(setTextSize(sanitizedSize));
    } catch (error) {
      console.error('Error loading text size setting:', error);
      dispatch(setTextSize('text-base')); // Default to medium on error
    }
  }, [dispatch]);

  const handleTextSizeChange = (option: Option) => {
    dispatch(setTextSize(option.value));
  };

  return (
    <>
      <label className="text-sm font-medium text-gray-800 dark:text-gray-200 mr-2">
        {t('Text Size')}
      </label>
      <SelectBox
        options={textSizeOptions}
        selectedOption={textSizeOptions.find((option) => option.value === textSize)!}
        setSelectedOption={handleTextSizeChange}
        buttonClassName="w-full rounded-lg"
      />
    </>
  );
};

export default TextSizeSetting;
