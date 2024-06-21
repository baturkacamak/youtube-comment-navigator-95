import React from "react";

export interface BoxProps {
    children: React.ReactNode;
    className?: string;
    bgColor?: string;
    darkBgColor?: string;
    borderColor?: string;
    darkBorderColor?: string;
}

export interface TooltipProps {
    text: string;
    children: React.ReactNode;
    className?: string;
    bgColor?: string;
    textColor?: string;
}

export interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface SettingsButtonProps {
    onClick: () => void;
}