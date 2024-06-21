import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';

import { TooltipProps } from "../../../types/layoutTypes";

const Tooltip: React.FC<TooltipProps> = ({ text, children, className, bgColor = 'bg-black', textColor = 'text-white' }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (wrapperRef.current) {
            const child = wrapperRef.current.firstChild as HTMLElement;
            if (child) {
                // Extract and remove margins from child
                const styles = window.getComputedStyle(child);
                const marginTop = styles.marginTop !== '0px' ? styles.marginTop : null;
                const marginRight = styles.marginRight !== '0px' ? styles.marginRight : null;
                const marginBottom = styles.marginBottom !== '0px' ? styles.marginBottom : null;
                const marginLeft = styles.marginLeft !== '0px' ? styles.marginLeft : null;

                // Apply the margins to the wrapper element if they exist
                if (marginTop) wrapperRef.current.style.marginTop = marginTop;
                if (marginRight) wrapperRef.current.style.marginRight = marginRight;
                if (marginBottom) wrapperRef.current.style.marginBottom = marginBottom;
                if (marginLeft) wrapperRef.current.style.marginLeft = marginLeft;

                // Remove margins from the child element
                child.style.marginTop = '0';
                child.style.marginRight = '0';
                child.style.marginBottom = '0';
                child.style.marginLeft = '0';
            }
        }
    }, []);

    return (
        <div ref={wrapperRef} className="relative group" aria-describedby="tooltip">
            {children}
            {text && (
                <div role="tooltip" className={classNames(
                    "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max px-2 py-1 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10",
                    bgColor,
                    textColor,
                    className
                )}>
                    {text}
                    <div className={classNames("absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2", bgColor, className)} style={{ clipPath: 'polygon(100% 0, 0 0, 50% 100%)' }}></div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;
