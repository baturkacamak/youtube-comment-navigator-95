import React, { useState, useEffect, useRef, ReactNode } from 'react';

interface DropdownMenuProps {
    buttonContent: ReactNode;
    children: ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ buttonContent, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const adjustMenuPosition = () => {
        if (menuRef.current && buttonRef.current) {
            const menuRect = menuRef.current.getBoundingClientRect();
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (menuRect.right > viewportWidth) {
                menuRef.current.style.right = '0';
                menuRef.current.style.left = 'auto';
            } else {
                menuRef.current.style.left = '0';
                menuRef.current.style.right = 'auto';
            }

            if (menuRect.bottom > viewportHeight) {
                menuRef.current.style.bottom = `${buttonRect.height}px`;
                menuRef.current.style.top = 'auto';
            } else {
                menuRef.current.style.top = `${buttonRect.height}px`;
                menuRef.current.style.bottom = 'auto';
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuRef, buttonRef]);

    useEffect(() => {
        if (isOpen) {
            adjustMenuPosition();
        }
    }, [isOpen]);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
            >
                {buttonContent}
            </button>
            <div
                ref={menuRef}
                className={`origin-top-left absolute mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 ring-1 ring-black ring-opacity-5 transform transition-all duration-300 ease-in-out ${
                    isOpen ? 'opacity-100 translate-y-0 py-2 max-h-96' : 'opacity-0 -translate-y-2 py-0 max-h-0 overflow-hidden pointer-events-none'
                }`}
            >
                {children}
            </div>
        </div>
    );
};

export default DropdownMenu;
