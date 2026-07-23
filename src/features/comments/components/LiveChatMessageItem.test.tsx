import { fireEvent, render, screen } from '@testing-library/react';
import LiveChatMessageItem from './LiveChatMessageItem';

vi.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      settings: { textSize: 'text-base', fontFamily: 'Arial, sans-serif' },
      searchKeyword: '',
    }),
}));

vi.mock('../services/liveChat/liveChatDatabase', () => ({
  loadLiveChatReplies: vi.fn(),
}));

vi.mock('./CommentReplies', () => ({
  default: () => null,
}));

describe('LiveChatMessageItem', () => {
  it('seeks through the shared video controller exactly once', () => {
    const postMessage = vi.spyOn(window, 'postMessage');
    render(
      <LiveChatMessageItem
        message={{
          messageId: 'message-1',
          videoId: 'video-1',
          author: 'Viewer',
          authorChannelId: '',
          authorAvatarUrl: '',
          isAuthorContentCreator: false,
          message: 'Hello',
          timestampUsec: '10000000',
          timestampMs: 10000,
          publishedDate: 10000,
          published: '2026-03-13T12:00:10.000Z',
          videoOffsetTimeSec: 16,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '0:16' }));

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: 'YCN_SEEK_TO', seconds: 16 }, '*');
  });
});
