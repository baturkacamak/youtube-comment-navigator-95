import React from 'react';

import {ButtonProps} from "../../../types/buttonTypes";

const Button: React.FC<ButtonProps> = ({ onClick, icon: Icon, label, className }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center space-x-2 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${className}`}
            aria-label={label}
        >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
        </button>
    );
};

export default Button;
