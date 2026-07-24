import React from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Button from '../../shared/components/Button';
import AIApiKeySetting from '../../settings/components/AIApiKeySetting';
import AIResponseLanguageSetting from '../../settings/components/AIResponseLanguageSetting';
import AIAnalysisSourceSetting from '../../settings/components/AIAnalysisSourceSetting';

interface AIConfigurationPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

const AIConfigurationPanel: React.FC<AIConfigurationPanelProps> = ({ isOpen, onToggle }) => {
  const { t } = useTranslation();

  return (
    <section className="overflow-visible rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50">
      <Button
        onClick={onToggle}
        icon={Cog6ToothIcon}
        label={t('AI settings')}
        className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        aria-expanded={isOpen}
        aria-controls="ai-configuration-content"
      />
      {isOpen && (
        <div className="grid gap-3 border-t border-gray-200 p-3 dark:border-gray-600 md:grid-cols-3">
          <div className="rounded-lg bg-white p-3 dark:bg-gray-800">
            <AIApiKeySetting />
          </div>
          <div className="rounded-lg bg-white p-3 dark:bg-gray-800">
            <AIResponseLanguageSetting />
          </div>
          <div className="rounded-lg bg-white p-3 dark:bg-gray-800">
            <AIAnalysisSourceSetting />
          </div>
        </div>
      )}
    </section>
  );
};

export default AIConfigurationPanel;
