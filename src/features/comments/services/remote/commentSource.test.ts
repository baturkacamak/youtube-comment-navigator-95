import { describe, expect, it } from 'vitest';
import { shouldUseDataApiForComments } from './commentSource';

describe('shouldUseDataApiForComments', () => {
  it('uses the Data API only when the comment source explicitly selects it', () => {
    expect(shouldUseDataApiForComments('dataApi')).toBe(true);
    expect(shouldUseDataApiForComments('auto')).toBe(false);
    expect(shouldUseDataApiForComments('innertube')).toBe(false);
    expect(shouldUseDataApiForComments(undefined)).toBe(false);
  });
});
