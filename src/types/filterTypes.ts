// src/types/Filters.ts
import React from "react";

import {Option} from "./utilityTypes";

export interface Filters {
    sortBy: string;
    sortOrder: string;
}

export interface FilterState extends Filters {
    // Add any other filter-specific fields here if necessary
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
}

export interface SidebarFilterPanelProps {
    filters: any;
    setFilters: (filters: any) => void;
}

export interface AdvancedSortingProps {
    filters: any;
    setFilters: (filters: any) => void;
}

export interface SortListProps {
    filters: any;
    setFilters: (filters: any) => void;
}