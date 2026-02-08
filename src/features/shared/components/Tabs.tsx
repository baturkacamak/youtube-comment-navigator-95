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
    <div className="tabs tabs--container cq">
      <div className="tabs__list [scrollbar-gutter:stable] flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar cq-[44rem]:flex-wrap cq-[44rem]:overflow-x-visible cq-[44rem]:gap-2 cq-[44rem]:pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.title.id}
            className={`tabs__button relative shrink-0 whitespace-nowrap px-3 py-2 text-sm cq-[44rem]:px-[0.9rem] cq-[44rem]:py-2 cq-[44rem]:text-[0.95rem] flex items-center gap-2 transition-all duration-300 ${
              activeTab === tab.title.id
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-gray-800 dark:text-gray-300'
            } focus:outline-none hover:text-teal-400`}
            onClick={() => handleTabClick(tab.title.id)}
          >
            <tab.title.icon className="tabs__button-icon w-4 h-4 cq-[44rem]:w-[1.125rem] cq-[44rem]:h-[1.125rem]" />
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
      <hr className="tabs__divider h-px -mt-1 cq-[44rem]:-mt-2 bg-gray-300 dark:bg-gray-600" />
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
