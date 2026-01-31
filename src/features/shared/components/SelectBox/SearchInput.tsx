// src/components/common/SelectBox/SearchInput.tsx
import React, { RefObject } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Input from '../Input';

interface SearchInputProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchRef: RefObject<HTMLInputElement>;
}

const SearchInput: React.FC<SearchInputProps> = ({ searchTerm, setSearchTerm, searchRef }) => {
  const { t } = useTranslation();

  return (
    <div className="relative p-2">
      <Input
        type="text"
        placeholder={t('Search...')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        ref={searchRef}
        className="w-full p-2 pl-10 text-sm bg-teal-100 dark:bg-gray-600 rounded-md focus:ring-blue-600"
        aria-label={t('Search...')}
      />
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
    </div>
  );
};

export default SearchInput;
