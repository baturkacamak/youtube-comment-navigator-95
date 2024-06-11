import React, { useEffect, useState, useCallback, FormEvent, useRef } from 'react';
import SelectBox from '../../common/SelectBox';
import Box from '../../common/Box';
import {
    ChatBubbleOvalLeftIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    InboxIcon,
    MagnifyingGlassIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';

import { Option } from "../../../types/utilityTypes";

const options: Option[] = [
    { value: 'all', label: 'All', icon: ClipboardDocumentListIcon },
    { value: 'comments', label: 'Comments', icon: ChatBubbleOvalLeftIcon },
    { value: 'chat', label: 'Live Chat', icon: InboxIcon },
    { value: 'transcript', label: 'Transcript', icon: DocumentTextIcon },
];

const SearchBar: React.FC<{ onSearch: (query: string) => void }> = ({ onSearch }) => {
    const [query, setQuery] = useState('');
    const [selectedOption, setSelectedOption] = useState<Option>(options[0]);
    const [placeholder, setPlaceholder] = useState('Search comments...');
    const isFirstRender = useRef(true);

    const updatePlaceholder = useCallback(() => {
        switch (selectedOption.value) {
            case 'all':
                setPlaceholder('Search everything...');
                break;
            case 'comments':
                setPlaceholder('Search comments...');
                break;
            case 'chat':
                setPlaceholder('Search live chat...');
                break;
            case 'transcript':
                setPlaceholder('Search transcript...');
                break;
            default:
                setPlaceholder('Search...');
                break;
        }
    }, [selectedOption]);

    useEffect(() => {
        updatePlaceholder();
    }, [selectedOption, updatePlaceholder]);

    const handleSearch = () => {
        onSearch(query);
    };

    const handleClear = () => {
        setQuery('');
        onSearch('');
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        handleSearch();
    };

    return (
        <Box>
            <form onSubmit={handleSubmit} className="flex items-center p-2 relative">
                <SelectBox
                    options={options}
                    selectedOption={selectedOption}
                    setSelectedOption={setSelectedOption}
                />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="flex-grow p-2 bg-teal-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all duration-300 ease-in-out"
                />
                <button
                    type="button"
                    onClick={handleClear}
                    className={`absolute right-10 p-2 bg-teal-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none transition-all duration-300 ease-in-out ${
                        query ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                    }`}
                    style={{ transformOrigin: 'right' }}
                >
                    <XCircleIcon className="w-5 h-5 text-red-500" />
                </button>
                <button type="submit" className="p-2 bg-teal-700 dark:bg-gray-800 text-white rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
                    <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
            </form>
        </Box>
    );
};

export default SearchBar;
