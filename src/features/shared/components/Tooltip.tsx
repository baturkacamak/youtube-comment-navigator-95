import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { TooltipProps } from '../../../types/layoutTypes';

type Placement = NonNullable<TooltipProps['position']>;
const GAP = 8;
const VIEWPORT_PADDING = 8;

const Tooltip: React.FC<TooltipProps> = ({
  text,
  children,
  className,
  bgColor = 'bg-black',
  textColor = 'text-white',
  position = 'top',
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
  const [placement, setPlacement] = useState<Placement>(position);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    const tooltip = tooltipRef.current?.getBoundingClientRect();
    if (!trigger || !tooltip) return;
    const candidates: Placement[] = [
      position,
      ...(['top', 'bottom', 'right', 'left'] as Placement[]).filter((item) => item !== position),
    ];
    const fits = (side: Placement) =>
      side === 'top'
        ? trigger.top - tooltip.height - GAP >= VIEWPORT_PADDING
        : side === 'bottom'
          ? trigger.bottom + tooltip.height + GAP <= window.innerHeight - VIEWPORT_PADDING
          : side === 'left'
            ? trigger.left - tooltip.width - GAP >= VIEWPORT_PADDING
            : trigger.right + tooltip.width + GAP <= window.innerWidth - VIEWPORT_PADDING;
    const next = candidates.find(fits) || position;
    let left = trigger.left + trigger.width / 2 - tooltip.width / 2;
    let top = trigger.top - tooltip.height - GAP;
    if (next === 'bottom') top = trigger.bottom + GAP;
    if (next === 'left') {
      left = trigger.left - tooltip.width - GAP;
      top = trigger.top + trigger.height / 2 - tooltip.height / 2;
    }
    if (next === 'right') {
      left = trigger.right + GAP;
      top = trigger.top + trigger.height / 2 - tooltip.height / 2;
    }
    setPlacement(next);
    setStyle({
      position: 'fixed',
      zIndex: 2147483647,
      left: Math.max(
        VIEWPORT_PADDING,
        Math.min(left, window.innerWidth - tooltip.width - VIEWPORT_PADDING)
      ),
      top: Math.max(
        VIEWPORT_PADDING,
        Math.min(top, window.innerHeight - tooltip.height - VIEWPORT_PADDING)
      ),
      visibility: 'visible',
      backgroundColor: bgColor === 'bg-black' ? '#000' : undefined,
      color: textColor === 'text-white' ? '#fff' : undefined,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: 500,
      maxWidth: '320px',
      boxShadow: '0 1px 2px rgb(0 0 0 / 0.2)',
    });
  }, [position, bgColor, textColor]);

  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [visible, updatePosition, text]);

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex items-center"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-describedby={visible ? 'ycn-tooltip' : undefined}
      >
        {children}
      </div>
      {visible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            id="ycn-tooltip"
            role="tooltip"
            data-placement={placement}
            style={style}
            className={classNames(
              'fixed z-[2147483647] w-max max-w-xs px-2 py-1 text-xs font-medium rounded shadow-sm pointer-events-none',
              bgColor,
              textColor,
              className
            )}
          >
            {text}
          </div>,
          document.body
        )}
    </>
  );
};

export default Tooltip;
