import React, { forwardRef } from 'react';
import classNames from 'classnames';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Optional label to display above the input.
   * Note: logic for layout (e.g. wrapping div) should be handled by parent or extended here if consistent.
   */
  label?: string;
}

/**
 * Shared Input component to standardize styling across the application.
 * Accepts all standard HTML input attributes.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    const baseStyles =
      'bg-neutral-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded transition-all duration-300 ease-in-out focus:outline-none';

    // Default padding if not overridden, but allow className to control it if needed.
    // However, classNames usually appends. If we want defaults, we put them in base.
    // Given the variety (py-1 px-2 vs p-2), I'll add a moderate default 'p-2'
    // but if the user passes padding classes, they will apply (CSS cascade depends on definition order,
    // but with Tailwind, usually the last class doesn't automatically win unless using tailwind-merge.
    // Since we only have classNames, I will avoid "p-2" in base if it conflicts often,
    // but 'p-2' is common. AdvancedFilters uses 'py-1 px-2'.

    // I'll stick to a minimal set of structural styles and allow overrides.

    const combinedClasses = classNames(
      baseStyles,
      // Add default padding/focus ring only if not likely to conflict,
      // or rely on the fact that most usages want similar things.
      'focus:ring-2 focus:ring-neutral-300 dark:focus:ring-gray-500',
      className
    );

    return <input ref={ref} type={type} className={combinedClasses} {...props} />;
  }
);

Input.displayName = 'Input';

export default Input;
