import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import ToggleButton from '../../shared/components/ToggleButton';
import { RootState } from '../../../types/rootState';
import { getSettings } from '../utils/settingsUtils';
import { setEnableDeveloperMode } from '../../../store/store';

const DeveloperModeToggle: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const enableDeveloperMode = useSelector(
    (state: RootState) => !!state.settings.enableDeveloperMode
  );

  useEffect(() => {
    const settings = getSettings();
    dispatch(setEnableDeveloperMode((settings.enableDeveloperMode as boolean) ?? false));
  }, [dispatch]);

  return (
    <>
      <label className="text-sm font-medium text-gray-800 dark:text-gray-200 mr-2 select-none">
        {t('Developer Mode')}
      </label>
      <ToggleButton
        isChecked={enableDeveloperMode}
        onToggle={() => dispatch(setEnableDeveloperMode(!enableDeveloperMode))}
      />
    </>
  );
};

export default DeveloperModeToggle;
