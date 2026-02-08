import React from 'react';
import { motion } from 'framer-motion';

interface TabTitle {
  id: string;
  label: string | JSX.Element;
  icon: React.ElementType;
}

interface Tab {
  title: TabTitle;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
  };

  return (
    <div className="tabs tabs--container">
      <div className="tabs__list flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.title.id}
            className={`tabs__button relative shrink-0 whitespace-nowrap px-3 py-2 text-sm flex items-center gap-2 transition-all duration-300 ${
              activeTab === tab.title.id
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-gray-800 dark:text-gray-300'
            } focus:outline-none hover:text-teal-400`}
            onClick={() => handleTabClick(tab.title.id)}
          >
            <tab.title.icon className="tabs__button-icon w-4 h-4" />
            {tab.title.label}
            {activeTab === tab.title.id && (
              <motion.div
                layoutId="underline"
                className="tabs__active-underline absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 dark:bg-teal-400"
                initial={false}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
            )}
          </button>
        ))}
      </div>
      <hr className="tabs__divider h-px -mt-1 bg-gray-300 dark:bg-gray-600" />
      <div className="tabs__content tab-content-container">
        {tabs.map(
          (tab) =>
            activeTab === tab.title.id && (
              <div key={tab.title.id} className="tabs__pane pt-4 animate-fade-in">
                {tab.content}
              </div>
            )
        )}
      </div>
    </div>
  );
};

export default Tabs;
