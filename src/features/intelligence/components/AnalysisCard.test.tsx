import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalysisCard from './AnalysisCard';
import { AnalysisStatus } from '../hooks/useAnalysisManager';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../shared/components/Collapsible', () => ({
  default: ({ children, isOpen }: any) => (
    <div data-testid="collapsible" style={{ display: isOpen ? 'block' : 'none' }}>
      {children}
    </div>
  ),
}));

vi.mock('../../shared/components/Tooltip', () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../shared/components/ConfirmationDialog', () => ({
  default: ({ isOpen, onConfirm, onCancel, title }: any) =>
    isOpen ? (
      <div data-testid="confirmation-dialog">
        <h1>{title}</h1>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock('../hooks/useLocalIntelligence', () => ({
  useLocalIntelligence: () => ({ status: 'unavailable' }),
}));

describe('AnalysisCard', () => {
  const defaultProps = {
    title: 'Test Title',
    description: 'Test Description',
    icon: <span data-testid="icon">Icon</span>,
    accentColorClass: 'border-blue-500',
    status: 'idle' as AnalysisStatus,
    result: null,
    error: null,
    isExpanded: false,
    canAnalyze: true,
    onAnalyze: vi.fn(),
    onClear: vi.fn(),
    onToggleExpanded: vi.fn(),
  };

  it('renders idle state correctly', () => {
    render(<AnalysisCard {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();

    const analyzeBtn = screen.getByText('Analyze');
    expect(analyzeBtn).toBeInTheDocument();
    expect(analyzeBtn).toBeEnabled();
  });

  it('renders loading state correctly', () => {
    render(<AnalysisCard {...defaultProps} status="loading" />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.queryByText('Analyze')).not.toBeInTheDocument();
  });

  it('renders success state correctly (collapsed)', () => {
    render(
      <AnalysisCard
        {...defaultProps}
        status="success"
        result="Analysis Result"
        isExpanded={false}
      />
    );

    // Header buttons
    expect(screen.getByLabelText('Expand')).toBeInTheDocument();
    expect(screen.getByTitle('Clear and rerun')).toBeInTheDocument();

    // Result should be in Collapsible, which we mocked to hide if !isOpen
    const collapsible = screen.getByTestId('collapsible');
    expect(collapsible).toHaveStyle({ display: 'none' });
  });

  it('renders success state correctly (expanded)', () => {
    render(
      <AnalysisCard {...defaultProps} status="success" result="Analysis Result" isExpanded={true} />
    );

    expect(screen.getByLabelText('Collapse')).toBeInTheDocument();
    const collapsible = screen.getByTestId('collapsible');
    expect(collapsible).toHaveStyle({ display: 'block' });
    expect(screen.getByText('Analysis Result')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    render(<AnalysisCard {...defaultProps} status="error" error="Test Error" isExpanded={true} />);

    expect(screen.getByText('Test Error')).toBeInTheDocument();
  });

  it('handles analyze click', () => {
    render(<AnalysisCard {...defaultProps} />);

    fireEvent.click(screen.getByText('Analyze'));
    expect(defaultProps.onAnalyze).toHaveBeenCalled();
  });

  it('handles cancel click', () => {
    render(<AnalysisCard {...defaultProps} status="loading" />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClear).toHaveBeenCalled();
  });

  it('handles clear click with confirmation', () => {
    render(<AnalysisCard {...defaultProps} status="success" result="Result" />);

    // Click clear button (arrow path icon)
    fireEvent.click(screen.getByTitle('Clear and rerun'));

    // Dialog should open
    expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();

    // Click confirm
    fireEvent.click(screen.getByText('Confirm'));

    expect(defaultProps.onClear).toHaveBeenCalled();
    expect(screen.queryByTestId('confirmation-dialog')).not.toBeInTheDocument();
  });
});
