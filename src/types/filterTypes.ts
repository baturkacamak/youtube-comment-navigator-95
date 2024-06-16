// src/types/Filters.ts
import React from "react";

import {Option} from "./utilityTypes";

export interface Filters {
    sortBy: string;
    sortOrder: string;
    minLikes: number;
    minDislikes: number;
    startDate: string;
    endDate: string;
    user: string;
    verified: boolean;
    hasLinks: boolean;
    minLength: number;
    maxLength: number;
    extendedSearch: boolean;
    keyword: string; // Add the missing keyword property here
}

export interface FilterState extends Filters {}

export interface CheckboxFilterProps {
    name: string;
    icon: React.ReactNode;
    value: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
}

export interface FilterListProps {
    filters: any;
    setFilters: (filters: any) => void;
}

export interface RadioFilterProps {
    name: string;
    label: string;
    icon: JSX.Element;
    value: string;
    selectedValue: string;
    sortOrder: string;
    isRandom?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onToggleSortOrder: () => void;
}

export interface SelectBoxProps {
    options: Option[];
    selectedOption: Option;
    setSelectedOption: (option: Option) => void;
    buttonClassName?: string;
    isSearchable?: boolean;
    DefaultIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export interface ControlPanelProps {
    filters: any;
    setFilters: (filters: any) => void;
    onLoadComments: (bypassCache?: boolean) => Promise<void>;
    onLoadChat: () => Promise<void>;
    onLoadTranscript: () => Promise<void>;
    onLoadAll: (bypassCache?: boolean) => Promise<void>;
    repliesCount: number;
    transcriptsCount: number;
    openSettings: () => void;
    toggleBookmarkedComments: () => void;
    showBookmarkedComments: boolean;
}

export interface AdvancedSortingProps {
    filters: any;
    setFilters: (filters: any) => void;
}

export interface SortListProps {
    filters: any;
    setFilters: (filters: any) => void;
}
