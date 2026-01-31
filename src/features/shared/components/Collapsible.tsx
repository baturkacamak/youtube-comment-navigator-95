import React, { useEffect, useRef, useState } from 'react';

interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  children: React.ReactNode;
  animateOpacity?: boolean;
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ isOpen, children, className = '', id, animateOpacity = true, role, style, ...rest }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(0);

    useEffect(() => {
      if (isOpen && contentRef.current) {
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            setHeight(entry.contentRect.height);
          }
        });

        resizeObserver.observe(contentRef.current);
        // Initial measurement
        setHeight(contentRef.current.scrollHeight);

        return () => resizeObserver.disconnect();
      }
    }, [isOpen, children]);

    return (
      <div
        ref={ref}
        id={id}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${className}`}
        style={{
          maxHeight: isOpen ? `${height}px` : '0px',
          opacity: animateOpacity ? (isOpen ? 1 : 0) : 1,
          ...style,
        }}
        aria-expanded={isOpen}
        role={role}
        {...rest}
      >
        <div ref={contentRef}>{children}</div>
      </div>
    );
  }
);

Collapsible.displayName = 'Collapsible';

export default Collapsible;
