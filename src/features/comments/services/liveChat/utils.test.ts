import { describe, expect, it } from 'vitest';
import { formatChatRuns } from './utils';

describe('formatChatRuns', () => {
  it('preserves standard emoji runs alongside text', () => {
    const result = formatChatRuns([
      { text: 'Hazir Olun ' },
      {
        emoji: {
          emojiId: '🙂',
          shortcuts: [':slightly_smiling_face:'],
          image: {
            accessibility: {
              accessibilityData: {
                label: 'slightly smiling face',
              },
            },
          },
        },
      },
      { text: ' basliyor' },
    ]);

    expect(result.fullText).toBe('Hazir Olun 🙂 basliyor');
  });

  it('preserves custom emoji-only messages', () => {
    const result = formatChatRuns([
      {
        emoji: {
          emojiId: 'custom-emoji-id',
          isCustomEmoji: true,
          shortcuts: [':face-blue-smiling:'],
          image: {
            accessibility: {
              accessibilityData: {
                label: 'face-blue-smiling',
              },
            },
          },
        },
      },
    ]);

    expect(result.fullText).toBe(':face-blue-smiling:');
  });
});
