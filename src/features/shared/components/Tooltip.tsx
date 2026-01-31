import React, { useState } from 'react';
import classNames from 'classnames';
import { TooltipProps } from '../../../types/layoutTypes';

const Tooltip: React.FC<TooltipProps> = ({
  text,
  children,
  className,
  bgColor = 'bg-black',
  textColor = 'text-white',
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  // Tailwind does not support dynamic border color utilities like `border-t-${bgColor}` easily without safelisting or using arbitrary values if bgColor is complex.
  // However, the original code used `bgColor` for the main div. The arrow needs to match.
  // The original used `clipPath` on a simple div.
  // Let's stick to the original `clipPath` approach for the arrow but adapted for positions, or use CSS borders which are simpler.
  // If `bgColor` is 'bg-black', the arrow needs to be black. `text-black` on the arrow div + currentcolor borders works.
  // But `bgColor` prop is a background class, not a color value.
  // We can try to keep the original clipPath div but positioned dynamically.

  // Mapping position to arrow position style
  const arrowPositionStyles: Record<string, React.CSSProperties> = {
    top: { top: '100%', left: '50%', transform: 'translateX(-50%)' },
    bottom: { bottom: '100%', left: '50%', transform: 'translateX(-50%) rotate(180deg)' },
    left: { left: '100%', top: '50%', transform: 'translateY(-50%) rotate(-90deg)' },
    right: { right: '100%', top: '50%', transform: 'translateY(-50%) rotate(90deg)' },
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      aria-describedby="tooltip"
    >
      {children}
      {text && (
        <div
          role="tooltip"
          className={classNames(
            'absolute w-max px-2 py-1 text-xs font-medium rounded shadow-sm z-50 pointer-events-none transition-opacity duration-200',
            positionClasses[position],
            bgColor,
            textColor,
            isVisible ? 'opacity-100' : 'opacity-0',
            className
          )}
        >
          {text}
          {/* Arrow */}
          <div
            className={classNames('absolute w-2 h-2 pointer-events-none', bgColor)}
            style={{
              clipPath: 'polygon(100% 0, 0 0, 50% 100%)',
              ...arrowPositionStyles[position],
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
