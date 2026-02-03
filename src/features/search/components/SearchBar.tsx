import React, { FormEvent, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ChatBubbleOvalLeftIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Option } from '../../../types/utilityTypes';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { RootState } from '../../../types/rootState';
import { setSearchKeyword, clearSearchKeyword } from '../../../store/store';
import Input from '../../shared/components/Input';

const SearchBar: React.FC = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const options: Option[] = [
    { value: 'all', label: t('All'), icon: ClipboardDocumentListIcon },
    { value: 'comments', label: t('Comments'), icon: ChatBubbleOvalLeftIcon },
    { value: 'chat', label: t('Live Chat'), icon: InboxIcon },
    { value: 'transcript', label: t('Transcript'), icon: DocumentTextIcon },
  ];

  const searchKeywordFromState = useSelector((state: RootState) => state.searchKeyword);
  const [searchKeyword, setSearchKeywordLocal] = useState(searchKeywordFromState);
  const [selectedOption] = useState<Option>(options[0]);

  const placeholder = useMemo(() => {
    switch (selectedOption.value) {
      case 'all':
        return t('Search everything...');
      case 'comments':
        return t('Search comments...');
      case 'chat':
        return t('Search live chat...');
      case 'transcript':
        return t('Search transcript...');
      default:
        return t('Search...');
    }
  }, [selectedOption.value, t]);

  const handleSearch = () => {
    dispatch(setSearchKeyword(searchKeyword));
  };

  const handleClear = () => {
    setSearchKeywordLocal('');
    dispatch(clearSearchKeyword());
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleSearch();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center p-2 relative"
      aria-label={t('Search form')}
    >
      <Input
        type="text"
        placeholder={placeholder}
        value={searchKeyword}
        onChange={(e) => setSearchKeywordLocal(e.target.value)}
        className="grow p-2"
        aria-label={placeholder}
      />
      <button
        type="button"
        onClick={handleClear}
        className={`absolute p-2 bg-neutral-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none transition-all duration-300 ease-in-out
                 ${isRtl ? ' left-10 ' : ' right-10 '}
                 ${searchKeyword ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`}
        style={{ transformOrigin: isRtl ? 'left' : 'right' }}
        aria-label={t('Clear search')}
      >
        <XCircleIcon className="w-5 h-5 text-red-500" />
      </button>
      <button
        type="submit"
        className={`p-2 bg-stone-500 dark:bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${isRtl ? 'rounded-l-lg ' : 'rounded-r-lg'}`}
        aria-label={t('Submit search')}
      >
        <MagnifyingGlassIcon className="w-5 h-5" />
      </button>
    </form>
  );
};

export default SearchBar;
