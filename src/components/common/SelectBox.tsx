// src/components/SelectBox.tsx
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { SelectBoxProps } from "../../types/filterTypes";
import { Option } from "../../types/utilityTypes";

const SelectBox: React.FC<SelectBoxProps> = ({ options, selectedOption, setSelectedOption, buttonClassName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleOptionClick = (option: Option, index: number) => {
        setSelectedOption(option);
        setHighlightedIndex(index);
        setIsOpen(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault(); // Prevent default behavior
                setHighlightedIndex((prevIndex) => (prevIndex + 1) % options.length);
                break;
            case 'ArrowUp':
                event.preventDefault(); // Prevent default behavior
                setHighlightedIndex((prevIndex) => (prevIndex - 1 + options.length) % options.length);
                break;
            case 'Enter':
                event.preventDefault(); // Prevent default behavior
                setSelectedOption(options[highlightedIndex]);
                setIsOpen(false);
                break;
            case 'Escape':
                event.preventDefault(); // Prevent default behavior
                setIsOpen(false);
                break;
        }
    };

    useEffect(() => {
        if (isOpen) {
            menuRef.current?.focus();
            const selectedIndex = options.findIndex(option => option.value === selectedOption.value);
            setHighlightedIndex(selectedIndex);
        }
    }, [isOpen, selectedOption]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuRef]);

    return (
        <div className="relative inline-block text-left w-48 h-10">
            <button
                type="button"
                className={`inline-flex h-10 justify-between w-full shadow-sm px-4 py-2 bg-teal-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 ${buttonClassName || 'rounded-lg'}`}
                id="options-menu"
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(prevIsOpen => !prevIsOpen)}
            >
                <span className="flex items-center">
                    <selectedOption.icon className="w-5 h-5 mr-2" />
                    {selectedOption.label}
                </span>
                <ChevronDownIcon className="w-5 h-5" />
            </button>
            <div
                className={`origin-top-left absolute z-20 left-0 mt-2 w-full rounded-md shadow-lg bg-teal-200 dark:bg-gray-700 ring-1 ring-black ring-opacity-5 transform transition-all duration-300 ease-in-out ${
                    isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}
                ref={menuRef}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="options-menu"
            >
                <div className="py-1">
                    {options.map((option, index) => (
                        <button
                            key={option.value}
                            onClick={() => handleOptionClick(option, index)}
                            className={`flex items-center px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 w-full ${
                                highlightedIndex === index ? 'bg-gray-100 dark:bg-gray-600' : ''
                            } transition-all duration-300 ease-in-out`}
                            role="menuitem"
                        >
                            <option.icon className="w-5 h-5 mr-2" />
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SelectBox;
