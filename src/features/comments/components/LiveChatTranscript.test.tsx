import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import LiveChatTranscript from './LiveChatTranscript';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock child components
vi.mock('./LiveChatMessageItem', () => ({
  default: ({ message }: any) => <li data-testid="chat-message">{message.message}</li>,
}));
vi.mock('../../transcripts/components/buttons/CopyButton', () => ({
  default: () => <button data-testid="copy-btn">Copy</button>,
}));
vi.mock('../../transcripts/components/buttons/PrintButton', () => ({
  default: () => <button data-testid="print-btn">Print</button>,
}));
vi.mock('../../shared/components/ShareButton', () => ({
  default: () => <button data-testid="share-btn">Share</button>,
}));
vi.mock('../../shared/components/CheckboxFilter', () => ({
  default: ({ checked, onChange, name }: any) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        data-testid="auto-scroll-checkbox"
      />
      {name}
    </label>
  ),
}));
vi.mock('../../shared/components/DownloadAccordion', () => ({
  DownloadAccordion: () => <div data-testid="download-accordion">Download</div>,
}));

describe('LiveChatTranscript', () => {
  const mockMessages = [
    { messageId: '1', author: 'User1', message: 'Hello', videoOffsetTimeSec: 10 },
    { messageId: '2', author: 'User2', message: 'World', videoOffsetTimeSec: 20 },
  ] as any[];

  it('renders loading state when empty and loading', () => {
    render(<LiveChatTranscript messages={[]} isLoading={true} />);
    expect(screen.getByText('Loading live chat transcript...')).toBeInTheDocument();
  });

  it('renders empty state when empty and not loading', () => {
    render(<LiveChatTranscript messages={[]} isLoading={false} />);
    expect(screen.getByText('This video has no live chat')).toBeInTheDocument();
  });

  it('renders list of messages', () => {
    render(<LiveChatTranscript messages={mockMessages} isLoading={false} />);
    expect(screen.getAllByTestId('chat-message')).toHaveLength(2);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
  });

  it('renders action bar buttons', () => {
    render(<LiveChatTranscript messages={mockMessages} isLoading={false} />);
    expect(screen.getByTestId('copy-btn')).toBeInTheDocument();
    expect(screen.getByTestId('print-btn')).toBeInTheDocument();
    expect(screen.getByTestId('share-btn')).toBeInTheDocument();
    expect(screen.getByTestId('download-accordion')).toBeInTheDocument();
  });

  it('shows loading more indicator when loading with messages', () => {
    render(<LiveChatTranscript messages={mockMessages} isLoading={true} hasMore={true} />);
    expect(screen.getByText('Loading more messages...')).toBeInTheDocument();
  });

  it('triggers onLoadMore when scrolling to bottom', () => {
    const onLoadMore = vi.fn();
    render(
      <LiveChatTranscript
        messages={mockMessages}
        isLoading={false}
        hasMore={true}
        onLoadMore={onLoadMore}
      />
    );

    const list = screen.getByRole('list');

    // Mock scroll properties
    Object.defineProperty(list, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(list, 'scrollTop', { value: 900, configurable: true }); // Near bottom
    Object.defineProperty(list, 'clientHeight', { value: 100, configurable: true });

    fireEvent.scroll(list);

    // Logic: scrollHeight - scrollTop - clientHeight < 100
    // 1000 - 900 - 100 = 0 < 100 -> Trigger
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('does NOT trigger onLoadMore when not near bottom', () => {
    const onLoadMore = vi.fn();
    render(
      <LiveChatTranscript
        messages={mockMessages}
        isLoading={false}
        hasMore={true}
        onLoadMore={onLoadMore}
      />
    );

    const list = screen.getByRole('list');

    // Mock scroll properties
    Object.defineProperty(list, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(list, 'scrollTop', { value: 0, configurable: true }); // Top
    Object.defineProperty(list, 'clientHeight', { value: 100, configurable: true });

    fireEvent.scroll(list);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('toggles auto-scroll', () => {
    render(<LiveChatTranscript messages={mockMessages} isLoading={false} />);

    const checkbox = screen.getByTestId('auto-scroll-checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
