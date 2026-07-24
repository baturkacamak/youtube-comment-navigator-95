import { CARD_CONFIGS } from './cardConfigs';

describe('consumer intelligence cards', () => {
  it('exposes the six viewer-focused analyses in their intended order', () => {
    expect(CARD_CONFIGS.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: 'comment-summary', title: 'Content Summary' },
      { id: 'key-takeaways', title: 'Key Takeaways' },
      { id: 'questions-and-answers', title: 'Questions & Answers' },
      { id: 'tips-and-resources', title: 'Tips & Resources' },
      { id: 'consensus-and-debate', title: 'Consensus & Debate' },
      { id: 'corrections-and-warnings', title: 'Corrections & Warnings' },
    ]);
  });

  it('does not expose creator-oriented idea mining or audience profiling', () => {
    const visibleCopy = CARD_CONFIGS.map(
      ({ title, description }) => `${title} ${description}`
    ).join(' ');

    expect(visibleCopy).not.toMatch(/video ideas|feature requests|audience profiling/i);
  });
});
