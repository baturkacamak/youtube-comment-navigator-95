import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

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
        <>
            <div className="flex justify-start space-x-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.title.id}
                        className={`relative px-4 py-2 flex items-center gap-2 transition-all duration-300 ${
                            activeTab === tab.title.id ? 'text-teal-600 dark:text-teal-400' : 'text-gray-800 dark:text-gray-300'
                        } focus:outline-none hover:text-teal-400`}
                        onClick={() => handleTabClick(tab.title.id)}
                    >
                        <tab.title.icon className="w-5 h-5" />
                        {tab.title.label}
                        {activeTab === tab.title.id && (
                            <motion.div
                                layoutId="underline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 dark:bg-teal-400"
                                initial={false}
                                animate={{ opacity: 1, scaleX: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            />
                        )}
                    </button>
                ))}
            </div>
            <hr className="h-px -mt-2 bg-gray-300 dark:bg-gray-600" />
            <AnimatePresence mode="wait">
                {tabs.map((tab) => (
                    activeTab === tab.title.id && (
                        <motion.div
                            key={tab.title.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="pt-4"
                        >
                            {tab.content}
                        </motion.div>
                    )
                ))}
            </AnimatePresence>
        </>
    );
};

export default Tabs;
