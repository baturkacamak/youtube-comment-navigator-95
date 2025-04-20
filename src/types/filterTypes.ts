// src/types/Filters.ts
import React from "react";

import {Option} from "./utilityTypes";

export interface Filters {
    keyword: string;
    verified: boolean;

    timestamps: boolean;
    heart: boolean;
    links: boolean;
    members: boolean;
    donated: boolean;
    creator: boolean;

    sortBy: string;
    sortOrder: string;

    likesThreshold: {
        min: number;
        max: number | string;
    };
    repliesLimit: {
        min: number;
        max: number | string;
    };
    wordCount: {
        min: number;
        max: number | string;
    };
    dateTimeRange: {
        start: string;
        end: string;
    };
}

export interface FilterState extends Filters {
}

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
    filters: any,
    setFilters: (filters: any) => void,
    comments?: any[] | Comment[]
}

export interface AdvancedSortingProps {
    filters: any;
    setFilters: (filters: any) => void;
}

export interface SortListProps {
    filters: any;
    setFilters: (filters: any) => void;
}

export const mapFiltersToCommentFilter = (filters: FilterState) => {
    return {
        hasTimestamp: filters.timestamps,
        isHearted: filters.heart,
        hasLinks: filters.links,
        isMember: filters.members,
        isDonated: filters.donated,
        isAuthorContentCreator: filters.creator,
    };
};

export const mapFiltersToAdvancedFilter = (filters: FilterState) => {
    return {
        likesThreshold: filters.likesThreshold,
        repliesLimit: filters.repliesLimit,
        wordCount: filters.wordCount,
        dateTimeRange: filters.dateTimeRange,
    };
};

export const mapFiltersToSortOptions = (filters: FilterState) => {
    return {
        sortBy: filters.sortBy || 'date',
        sortOrder: (filters.sortOrder || 'desc') as 'asc' | 'desc',
    };
};