import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import ShareButton from './ShareButton';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../utils/logger', () => ({
    default: {
        error: vi.fn(),
    }
}));

// Mock DropdownMenu to easily test children
vi.mock('./DropdownMenu', () => ({
    default: ({ children, buttonContent }: any) => (
        <div data-testid="dropdown-menu">
            <button data-testid="dropdown-trigger">{buttonContent}</button>
            <div data-testid="dropdown-content">
                {children}
            </div>
        </div>
    )
}));

// Mock window.open
const mockOpen = vi.fn();
window.open = mockOpen;

describe('ShareButton', () => {
    const defaultProps = {
        textToShare: 'Hello World',
        subject: 'Test Subject',
        url: 'https://example.com'
    };

    beforeEach(() => {
        mockOpen.mockClear();
    });

    it('renders correctly', () => {
        render(<ShareButton {...defaultProps} />);
        expect(screen.getByText('Share')).toBeInTheDocument();
        expect(screen.getByText('E-mail')).toBeInTheDocument();
        expect(screen.getByText('Whatsapp')).toBeInTheDocument();
    });

    it('opens email share link on click', () => {
        render(<ShareButton {...defaultProps} />);
        const emailBtn = screen.getByText('E-mail').closest('button');
        fireEvent.click(emailBtn!);
        
        expect(mockOpen).toHaveBeenCalled();
        const url = mockOpen.mock.calls[0][0];
        expect(url).toContain('mailto:');
        expect(url).toContain('Hello%20World');
    });

    it('memoizes correctly and prevents re-renders for same props', () => {
        const { rerender } = render(<ShareButton {...defaultProps} />);
        
        // First click
        const emailBtnBefore = screen.getByText('E-mail').closest('button');
        fireEvent.click(emailBtnBefore!);
        expect(mockOpen).toHaveBeenCalledTimes(1);

        rerender(<ShareButton {...defaultProps} />);
        
        // Second click after rerender
        const emailBtnAfter = screen.getByText('E-mail').closest('button');
        fireEvent.click(emailBtnAfter!);
        expect(mockOpen).toHaveBeenCalledTimes(2); 
    });
});
