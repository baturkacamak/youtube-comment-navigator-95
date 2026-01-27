import { normalizeString } from './normalizeString';

describe('normalizeString', () => {
  it('should convert the string to lowercase', () => {
    const input = 'Hello World';
    const expected = 'hello world';
    expect(normalizeString(input)).toBe(expected);
  });

  it('should remove diacritical marks', () => {
    const input = 'éèêëēėę';
    const expected = 'eeeeeee';
    expect(normalizeString(input)).toBe(expected);
  });

  it('should normalize the string into decomposed form and remove diacritical marks', () => {
    const input = 'Café Noël';
    const expected = 'cafe noel';
    expect(normalizeString(input)).toBe(expected);
  });

  it('should handle an empty string', () => {
    const input = '';
    const expected = '';
    expect(normalizeString(input)).toBe(expected);
  });

  it('should handle a string with no diacritical marks', () => {
    const input = 'normal string';
    const expected = 'normal string';
    expect(normalizeString(input)).toBe(expected);
  });

  it('should handle a string with mixed diacritical and non-diacritical characters', () => {
    const input = 'café normal';
    const expected = 'cafe normal';
    expect(normalizeString(input)).toBe(expected);
  });

  it('should handle a string with special characters', () => {
    const input = 'Café @ Noël!';
    const expected = 'cafe @ noel!';
    expect(normalizeString(input)).toBe(expected);
  });
});
