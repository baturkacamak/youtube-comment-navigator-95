import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ControlPanel from './ControlPanel';
import { executeDownload } from '../../shared/components/DownloadAccordion/downloadUtils';
import { useToast } from '../../shared/contexts/ToastContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('./SortList', () => ({
  default: () => <div data-testid="sort-list" />,
}));

vi.mock('./FilterList', () => ({
  default: () => <div data-testid="filter-list" />,
}));

vi.mock('./AdvancedFilters', () => ({
  default: () => <div data-testid="advanced-filters" />,
}));

vi.mock('../../batch-export/components/BatchExportAccordion', () => ({
  default: () => <div data-testid="batch-export" />,
}));

vi.mock('../../shared/components/DownloadAccordion/downloadUtils', () => ({
  executeDownload: vi.fn(),
  generateFileName: vi.fn().mockReturnValue('comments-export'),
}));

vi.mock('../../shared/contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../shared/components/Collapsible', () => ({
  default: ({ children, id, isOpen, className, style }: any) => (
    <div id={id} data-is-open={isOpen} className={className} style={style}>
      {children}
    </div>
  ),
}));

vi.mock('../../shared/utils/logger', () => ({
  default: {
    error: vi.fn(),
  },
}));

describe('ControlPanel Download Integration', () => {
  const mockShowToast = vi.fn();
  const baseFilters = {
    keyword: '',
    verified: false,
    hasLinks: false,
    sortBy: '',
    sortOrder: '',
    likesThreshold: { min: 0, max: Infinity },
    repliesLimit: { min: 0, max: Infinity },
    wordCount: { min: 0, max: Infinity },
    dateTimeRange: { start: '', end: '' },
  };

  const visibleComments = Array.from({ length: 20 }, (_, i) => ({
    commentId: `visible-${i + 1}`,
    content: `Visible comment ${i + 1}`,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (useToast as any).mockReturnValue({ showToast: mockShowToast });
  });

  it('uses container-first classes for responsive control and download layout', () => {
    const fetchAllComments = vi.fn().mockResolvedValue([]);
    const { container } = render(
      <ControlPanel
        filters={baseFilters}
        setFilters={vi.fn()}
        comments={visibleComments}
        allComments={fetchAllComments}
      />
    );

    const controlPanel = container.querySelector('.control-panel');
    const mainRow = container.querySelector('.control-panel__main-row');
    const downloadPanel = container.querySelector('#download-panel');

    expect(controlPanel).toHaveClass('cq');
    expect(mainRow?.className).toContain('cq-[52rem]:flex-row');
    expect(downloadPanel?.className).toContain('cq-[34rem]:start-0');
  });

  it('downloads all comments when "All" scope is selected', async () => {
    const allComments = Array.from({ length: 45 }, (_, i) => ({
      commentId: `all-${i + 1}`,
      content: `All comment ${i + 1}`,
    }));
    const fetchAllComments = vi.fn().mockResolvedValue(allComments);

    render(
      <ControlPanel
        filters={baseFilters}
        setFilters={vi.fn()}
        comments={visibleComments}
        allComments={fetchAllComments}
      />
    );

    fireEvent.click(screen.getByText('Download'));
    fireEvent.click(screen.getByDisplayValue('all'));
    fireEvent.click(screen.getByText('Download Now'));

    await waitFor(() => {
      expect(fetchAllComments).toHaveBeenCalledTimes(1);
      expect(executeDownload).toHaveBeenCalledWith(
        allComments,
        'json',
        'comments-export',
        undefined
      );
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        message: expect.stringContaining('Exported 45 comments'),
      })
    );
  });

  it('downloads only visible comments by default', async () => {
    const fetchAllComments = vi.fn().mockResolvedValue(
      Array.from({ length: 100 }, (_, i) => ({
        commentId: `all-${i + 1}`,
        content: `All comment ${i + 1}`,
      }))
    );

    render(
      <ControlPanel
        filters={baseFilters}
        setFilters={vi.fn()}
        comments={visibleComments}
        allComments={fetchAllComments}
      />
    );

    fireEvent.click(screen.getByText('Download'));
    fireEvent.click(screen.getByText('Download Now'));

    await waitFor(() => {
      expect(executeDownload).toHaveBeenCalledWith(
        visibleComments,
        'json',
        'comments-export',
        undefined
      );
    });

    expect(fetchAllComments).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        message: expect.stringContaining('Exported 20 comments'),
      })
    );
  });
});
