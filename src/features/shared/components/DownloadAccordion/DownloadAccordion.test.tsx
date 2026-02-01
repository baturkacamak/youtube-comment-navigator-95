import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DownloadAccordion from './DownloadAccordion';
import { executeDownload } from './downloadUtils';
import { useToast } from '../../contexts/ToastContext';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('./downloadUtils', () => ({
  executeDownload: vi.fn(),
  generateFileName: vi.fn().mockReturnValue('test-file'),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../Collapsible', () => ({
  default: ({ children, isOpen, id, className, style }: any) => (
    <div
      data-testid="collapsible"
      id={id}
      className={className}
      style={style}
      data-is-open={isOpen}
    >
      {children}
    </div>
  ),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
  },
}));

describe('DownloadAccordion', () => {
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (useToast as any).mockReturnValue({ showToast: mockShowToast });
  });

  it('renders download button correctly', () => {
    render(<DownloadAccordion contentType="comments" visibleData={[]} />);

    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('toggles panel on click', () => {
    render(<DownloadAccordion contentType="comments" visibleData={[]} />);

    const button = screen.getByText('Download').closest('button');
    const panel = screen.getByTestId('collapsible');

    // Initial state: closed
    expect(panel).toHaveStyle({ visibility: 'hidden' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    // Click to open
    fireEvent.click(button!);
    expect(panel).toHaveStyle({ visibility: 'visible' });
    expect(button).toHaveAttribute('aria-expanded', 'true');

    // Click to close
    fireEvent.click(button!);
    expect(panel).toHaveStyle({ visibility: 'hidden' });
  });

  it('closes panel when clicking outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <DownloadAccordion contentType="comments" visibleData={[]} />
      </div>
    );

    const button = screen.getByText('Download').closest('button');
    const panel = screen.getByTestId('collapsible');

    // Open panel
    fireEvent.click(button!);
    expect(panel).toHaveStyle({ visibility: 'visible' });

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(panel).toHaveStyle({ visibility: 'hidden' });
  });

  it('saves format preference to localStorage', () => {
    render(
      <DownloadAccordion
        contentType="comments" // default json
        visibleData={[]}
      />
    );

    // Open panel to see options (conceptually, though rendered in DOM anyway in our mock)
    const button = screen.getByText('Download').closest('button');
    fireEvent.click(button!);

    // Find JSON option (default)
    const jsonInput = screen.getByDisplayValue('json') as HTMLInputElement;
    expect(jsonInput.checked).toBe(true);

    // Click CSV
    const csvInput = screen.getByDisplayValue('csv');
    fireEvent.click(csvInput);

    expect(localStorage.getItem('download_format_preference')).toBe('csv');
  });

  it('shows scope options only when allData is provided', () => {
    const { rerender } = render(<DownloadAccordion contentType="comments" visibleData={[]} />);

    // Should NOT show Content/Scope section
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Visible Only')).not.toBeInTheDocument();

    rerender(
      <DownloadAccordion
        contentType="comments"
        visibleData={[]}
        allData={[]} // Provided
      />
    );

    // Should show Content/Scope section
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Visible Only')).toBeInTheDocument();
  });

  it('executes download with correct data', async () => {
    const mockVisibleData = [{ id: 1 }];

    render(<DownloadAccordion contentType="comments" visibleData={mockVisibleData} />);

    const button = screen.getByText('Download').closest('button');
    fireEvent.click(button!);

    const downloadBtn = screen.getByText('Download Now');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(executeDownload).toHaveBeenCalledWith(
        mockVisibleData,
        'json', // default format for comments
        'test-file',
        undefined
      );
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        message: expect.stringContaining('Exported 1 comments'),
      })
    );
  });

  it('handles async allData retrieval', async () => {
    const mockAllData = [{ id: 1 }, { id: 2 }];
    const mockFetchAll = vi.fn().mockResolvedValue(mockAllData);

    render(<DownloadAccordion contentType="comments" visibleData={[]} allData={mockFetchAll} />);

    const button = screen.getByText('Download').closest('button');
    fireEvent.click(button!);

    // Select "All" scope
    const allScopeInput = screen.getByDisplayValue('all');
    fireEvent.click(allScopeInput);

    const downloadBtn = screen.getByText('Download Now');
    fireEvent.click(downloadBtn);

    expect(screen.getByText('Downloading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetchAll).toHaveBeenCalled();
    });

    expect(executeDownload).toHaveBeenCalledWith(mockAllData, 'json', 'test-file', undefined);
  });

  it('shows error toast when data is empty', async () => {
    render(
      <DownloadAccordion
        contentType="comments"
        visibleData={[]} // Empty
      />
    );

    const button = screen.getByText('Download').closest('button');
    fireEvent.click(button!);

    const downloadBtn = screen.getByText('Download Now');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'No data to export',
        })
      );
    });

    expect(executeDownload).not.toHaveBeenCalled();
  });

  it('shows error toast when download fails', async () => {
    (executeDownload as any).mockImplementation(() => {
      throw new Error('Download failed');
    });

    render(<DownloadAccordion contentType="comments" visibleData={[{ id: 1 }]} />);

    const button = screen.getByText('Download').closest('button');
    fireEvent.click(button!);

    const downloadBtn = screen.getByText('Download Now');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Download failed',
        })
      );
    });
  });
});
