import React, { useState } from 'react';
import FilterList from './FilterList';
import SortList from './SortList';
import AdvancedFilters from './AdvancedFilters';
import { ControlPanelProps } from '../../../types/filterTypes';
import { useTranslation } from 'react-i18next';
import { ArrowsUpDownIcon, ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { DownloadAccordion } from '../../shared/components/DownloadAccordion';
import Collapsible from '../../shared/components/Collapsible';
import BatchExportAccordion from '../../batch-export/components/BatchExportAccordion';

const ControlPanel: React.FC<ControlPanelProps> = ({
  filters,
  setFilters,
  comments,
  allComments,
}) => {
  const { t } = useTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="control-panel flex flex-col gap-2">
      <div className="control-panel__sort-row flex gap-x-4 items-center flex-wrap">
        <ArrowsUpDownIcon
          className="control-panel__sort-icon w-6 h-6 text-black dark:text-white"
          aria-hidden="true"
        />
        <SortList filters={filters} setFilters={setFilters} />
      </div>
      <div className="control-panel__main-row flex gap-4 items-center justify-between flex-wrap">
        <div className="control-panel__filters flex gap-4">
          <FunnelIcon
            className="control-panel__filter-icon w-6 h-6 text-black dark:text-white"
            aria-hidden="true"
          />
          <FilterList filters={filters} setFilters={setFilters} />
        </div>
        <div className="control-panel__actions flex items-center gap-4">
          <BatchExportAccordion />
          <DownloadAccordion contentType="comments" visibleData={comments} allData={allComments} />
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="control-panel__advanced-toggle user-select flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
          >
            {t('Advanced')}
            <ChevronDownIcon
              className={`control-panel__advanced-chevron w-5 h-5 ml-1 transform transition-transform duration-500 ${showAdvanced ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      <Collapsible isOpen={showAdvanced} className="control-panel__advanced-content">
        <AdvancedFilters />
      </Collapsible>
    </div>
  );
};

export default ControlPanel;
