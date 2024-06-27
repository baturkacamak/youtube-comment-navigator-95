import React from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

import { BoxProps } from "../../../types/layoutTypes";

const Box: React.FC<BoxProps> = ({
                                     children,
                                     className,
                                     bgColor = "bg-gradient-to-r from-slate to-slate-100",
                                     darkBgColor = "dark:bg-gradient-to-r dark:from-gray-700 dark:to-gray-800",
                                     borderColor = "border-2 border-gray-400",
                                     darkBorderColor = "dark:border-gray-600"
                                 }) => {
    const { t } = useTranslation();

    const inlineStyles = (color: string) => {
        if (/^#|rgb/.test(color)) {
            return { background: color };
        }
        return {};
    };

    const borderStyles = (color: string) => {
        if (/^#|rgb/.test(color)) {
            return { borderColor: color };
        }
        return {};
    };

    return (
        <div
            className={classNames(
                "p-4 transition-colors duration-500 rounded-lg shadow-md",
                {
                    [bgColor]: !/^#|rgb/.test(bgColor),
                    [darkBgColor]: !/^#|rgb/.test(darkBgColor),
                    [borderColor]: !/^#|rgb/.test(borderColor),
                    [darkBorderColor]: !/^#|rgb/.test(darkBorderColor)
                },
                className
            )}
            style={{
                ...inlineStyles(bgColor),
                ...inlineStyles(darkBgColor),
                ...borderStyles(borderColor),
                ...borderStyles(darkBorderColor)
            }}
            aria-live="polite"
        >
            {children}
        </div>
    );
};

export default Box;
