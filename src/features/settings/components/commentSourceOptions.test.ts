import { describe, expect, it } from 'vitest';
import { getCommentSourceOptions, resolveSelectableCommentSource } from './commentSourceOptions';

const t = (key: string) => key;

describe('comment source options', () => {
  it('disables the Data API source until a key is configured', () => {
    const withoutKey = getCommentSourceOptions(t, false);
    const withKey = getCommentSourceOptions(t, true);

    expect(getCommentSourceOptions(t, false).map((option) => option.value)).toEqual([
      'auto',
      'innertube',
      'dataApi',
    ]);
    expect(withoutKey.find((option) => option.value === 'dataApi')).toMatchObject({
      disabled: true,
      disabledReason: 'Requires a YouTube Data API key in Settings.',
    });
    expect(withKey.find((option) => option.value === 'dataApi')).toMatchObject({
      disabled: false,
      disabledReason: undefined,
    });
  });

  it('falls back from Data API to automatic when the key is unavailable', () => {
    expect(resolveSelectableCommentSource('dataApi', false)).toBe('auto');
    expect(resolveSelectableCommentSource('dataApi', true)).toBe('dataApi');
    expect(resolveSelectableCommentSource('auto', false)).toBe('auto');
    expect(resolveSelectableCommentSource('innertube', false)).toBe('innertube');
  });
});
