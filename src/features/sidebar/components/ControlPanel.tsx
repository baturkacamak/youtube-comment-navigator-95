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
    <div className="control-panel cq flex flex-col gap-2">
      <div className="control-panel__sort-row flex items-start cq-[34rem]:items-center gap-2 cq-[42rem]:gap-3">
        <ArrowsUpDownIcon
          className="control-panel__sort-icon hidden cq-[34rem]:block w-4 h-4 cq-[42rem]:w-5 cq-[42rem]:h-5 text-black dark:text-white mt-1 cq-[34rem]:mt-0"
          aria-hidden="true"
        />
        <SortList filters={filters} setFilters={setFilters} />
      </div>
      <div className="control-panel__main-row flex flex-col gap-2 cq-[42rem]:gap-3 items-stretch cq-[52rem]:flex-row cq-[52rem]:items-center cq-[52rem]:justify-between">
        <div className="control-panel__filters flex gap-2 cq-[42rem]:gap-3 items-start cq-[52rem]:items-center">
          <FunnelIcon
            className="control-panel__filter-icon hidden cq-[34rem]:block w-4 h-4 cq-[42rem]:w-5 cq-[42rem]:h-5 text-black dark:text-white mt-1 cq-[34rem]:mt-0"
            aria-hidden="true"
          />
          <FilterList filters={filters} setFilters={setFilters} />
        </div>
        <div className="control-panel__actions flex items-center gap-2 cq-[42rem]:gap-3 flex-wrap cq-[52rem]:justify-end">
          <BatchExportAccordion />
          <DownloadAccordion contentType="comments" visibleData={comments} allData={allComments} />
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="control-panel__advanced-toggle user-select inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs cq-[42rem]:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300"
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
