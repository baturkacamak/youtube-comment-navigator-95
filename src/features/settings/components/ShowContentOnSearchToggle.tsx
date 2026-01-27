import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import ToggleButton from '../../shared/components/ToggleButton';
import { RootState } from '../../../types/rootState';
import { setShowContentOnSearch, setShowFiltersSorts } from '../../../store/store';
import { getSettings } from '../utils/settingsUtils';

const ShowContentOnSearchToggle: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const showContentOnSearch = useSelector((state: RootState) => state.settings.showContentOnSearch);

  useEffect(() => {
    const settings = getSettings();
    dispatch(setShowFiltersSorts(settings.showContentOnSearch ?? false));
  }, [dispatch]);

  const handleToggleContentOnSearch = () => {
    dispatch(setShowContentOnSearch(!showContentOnSearch));
  };

  return (
    <>
      <label className="text-sm font-medium text-gray-800 dark:text-gray-200 mr-2 select-none">
        {t('Show Content on Search')}
      </label>
      <ToggleButton isChecked={showContentOnSearch} onToggle={handleToggleContentOnSearch} />
    </>
  );
};

export default ShowContentOnSearchToggle;
