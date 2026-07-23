import React, { useMemo } from 'react';
import { LanguageIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { setAIResponseLanguage } from '../../../store/store';
import { selectAIResponseLanguage } from '../../../store/selectors';
import { languageOptions } from '../../shared/utils/appConstants';
import SelectBox from '../../shared/components/SelectBox/SelectBox';
import type { Option } from '../../../types/utilityTypes';
import { FOLLOW_INTERFACE_LANGUAGE } from '../../intelligence/services/aiResponseLanguage';

const AIResponseLanguageSetting: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const selectedValue = useSelector(selectAIResponseLanguage);
  const options = useMemo<Option[]>(
    () => [{ value: FOLLOW_INTERFACE_LANGUAGE, label: t('Same as interface') }, ...languageOptions],
    [t]
  );
  const selectedOption = options.find(({ value }) => value === selectedValue) ?? options[0];

  return (
    <div className="flex w-full flex-col gap-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
        <LanguageIcon className="h-4 w-4" />
        {t('AI response language')}
      </label>
      <SelectBox
        options={options}
        selectedOption={selectedOption}
        setSelectedOption={(option) => dispatch(setAIResponseLanguage(option.value))}
        isSearchable={true}
        DefaultIcon={LanguageIcon}
        containerClassName="w-full"
        buttonClassName="text-xs"
        testId="ai-response-language-select"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('AI analyses will be generated in this language.')}
      </p>
    </div>
  );
};

export default AIResponseLanguageSetting;
