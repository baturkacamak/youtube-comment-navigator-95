import {
  containsTimestamp,
  findTimestamps,
  linkifyTimestampsInSafeHtml,
  timestampToSeconds,
} from './timestamps';

describe('timestamp utilities', () => {
  it('finds minute and hour timestamps while rejecting invalid values', () => {
    expect(findTimestamps('See 16:49 and 1:28:48, but not 28:99.')).toEqual([
      { value: '16:49', index: 4 },
      { value: '1:28:48', index: 14 },
    ]);
    expect(containsTimestamp('Jump to 28:48')).toBe(true);
    expect(containsTimestamp('Invalid 28:99')).toBe(false);
  });

  it('converts valid timestamps to seconds', () => {
    expect(timestampToSeconds('16:49')).toBe(1009);
    expect(timestampToSeconds('1:28:48')).toBe(5328);
    expect(timestampToSeconds('28:99')).toBeNull();
  });

  it('linkifies safe HTML text without changing links or code', () => {
    const html = linkifyTimestampsInSafeHtml(
      '<p>Watch 16:49</p><code>28:48</code><a href="#">30:00</a>'
    );
    const container = document.createElement('div');
    container.innerHTML = html;

    expect(container.querySelector('button[data-timestamp="16:49"]')).not.toBeNull();
    expect(container.querySelector('code')?.querySelector('button')).toBeNull();
    expect(container.querySelector('a')?.querySelector('button')).toBeNull();
  });
});
