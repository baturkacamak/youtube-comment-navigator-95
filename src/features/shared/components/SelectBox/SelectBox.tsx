import React, { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { SelectBoxProps } from "../../../../types/filterTypes";
import { Option } from "../../../../types/utilityTypes";
import { normalizeString } from '../../utils/normalizeString';
import SearchInput from './SearchInput';
import OptionList from './OptionList';
import { useTranslation } from 'react-i18next';
import i18n from "i18next";

const SelectBox: React.FC<SelectBoxProps> = ({
                                                 options,
                                                 selectedOption,
                                                 setSelectedOption,
                                                 buttonClassName,
                                                 isSearchable = false,
                                                 DefaultIcon,
                                             }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [filteredOptions, setFilteredOptions] = useState<Option[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const isRtl = i18n.dir() === 'rtl';

    useEffect(() => {
        // Exclude the placeholder option when the dropdown is open
        const displayedOptions = options.filter(option => option.value !== '');
        const translatedOptions = displayedOptions.map(option => ({
            ...option,
            label: option.label
        }));
        setFilteredOptions(translatedOptions);
    }, [options, t]);

    const handleOptionClick = (option: Option, index: number) => {
        setSelectedOption(option);
        setHighlightedIndex(index);
        setIsOpen(false);
        setSearchTerm('');
        // Reset filtered options to exclude the placeholder
        const displayedOptions = options.filter(option => option.value !== '');
        setFilteredOptions(displayedOptions);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setHighlightedIndex((prevIndex) => (prevIndex + 1) % filteredOptions.length);
                break;
            case 'ArrowUp':
                event.preventDefault();
                setHighlightedIndex((prevIndex) => (prevIndex - 1 + filteredOptions.length) % filteredOptions.length);
                break;
            case 'Enter':
                event.preventDefault();
                setSelectedOption(filteredOptions[highlightedIndex]);
                setIsOpen(false);
                setSearchTerm('');
                // Reset filtered options to exclude the placeholder
                const displayedOptions = options.filter(option => option.value !== '');
                setFilteredOptions(displayedOptions);
                break;
            case 'Escape':
                event.preventDefault();
                setIsOpen(false);
                break;
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (isSearchable) {
                searchRef.current?.focus();
            } else {
                menuRef.current?.focus();
            }
            const selectedIndex = options.findIndex(option => option.value === selectedOption.value);
            setHighlightedIndex(selectedIndex);
        }
    }, [isOpen, options, selectedOption, isSearchable]);

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

    useEffect(() => {
        if (isSearchable) {
            const normalizedSearchTerm = normalizeString(searchTerm);
            const filtered = options.filter(option =>
                option.value !== '' && normalizeString(option.label).includes(normalizedSearchTerm)
            );
            setFilteredOptions(filtered);
            setHighlightedIndex(0);
        }
    }, [searchTerm, options, isSearchable, t]);

    return (
        <div className="relative inline-block text-left w-48 h-10">
            <button
                type="button"
                className={`inline-flex h-full justify-between items-center  w-full shadow-sm px-4 py-2 bg-teal-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 ${buttonClassName || 'rounded-lg'}`}
                id="options-menu"
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(prevIsOpen => !prevIsOpen)}
            >
                <span className="flex items-center">
                    {selectedOption.icon ? <selectedOption.icon className="w-5 h-5 mr-2" /> : DefaultIcon && <DefaultIcon className="w-5 h-5 mr-2" />}
                    {selectedOption.label || t('Select an option')}
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
                {isSearchable && <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} searchRef={searchRef} />}
                <OptionList options={filteredOptions} highlightedIndex={highlightedIndex} handleOptionClick={handleOptionClick} searchTerm={searchTerm} />
            </div>
        </div>
    );
};

export default SelectBox;
