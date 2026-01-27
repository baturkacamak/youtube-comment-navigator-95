import React from 'react';
import { ButtonProps } from '../../../types/buttonTypes';

const Button: React.FC<ButtonProps> = ({ onClick, icon: Icon, label, className, iconOnly }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${className}`}
      aria-label={typeof label === 'string' ? label : undefined} // Provide aria-label only if label is a string
    >
      <Icon className="w-5 h-5" />
      {!iconOnly && <span>{label}</span>}
    </button>
  );
};

export default Button;
