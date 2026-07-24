import React, { useMemo } from 'react';
import { DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { setAIAnalysisSource } from '../../../store/store';
import { selectAIAnalysisSource } from '../../../store/selectors';
import SelectBox from '../../shared/components/SelectBox/SelectBox';
import type { Option } from '../../../types/utilityTypes';
import type { AIAnalysisSource } from '../../intelligence/types/analysis';

const AIAnalysisSourceSetting: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const selectedValue = useSelector(selectAIAnalysisSource);
  const options = useMemo<Option[]>(
    () => [
      { value: 'auto', label: t('Automatic (recommended)') },
      { value: 'combined', label: t('Video + comments') },
      { value: 'transcript', label: t('Video transcript only') },
      { value: 'comments', label: t('Comments only') },
    ],
    [t]
  );
  const selectedOption = options.find(({ value }) => value === selectedValue) ?? options[0];

  return (
    <div className="flex w-full flex-col gap-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
        <DocumentMagnifyingGlassIcon className="h-4 w-4" />
        {t('Analysis source')}
      </label>
      <SelectBox
        options={options}
        selectedOption={selectedOption}
        setSelectedOption={(option) =>
          dispatch(setAIAnalysisSource(option.value as AIAnalysisSource))
        }
        DefaultIcon={DocumentMagnifyingGlassIcon}
        containerClassName="w-full"
        buttonClassName="text-xs"
        testId="ai-analysis-source-select"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('Automatic chooses the best available source for each analysis.')}
      </p>
    </div>
  );
};

export default AIAnalysisSourceSetting;
