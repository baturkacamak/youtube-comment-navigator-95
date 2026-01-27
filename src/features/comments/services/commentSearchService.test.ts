import { searchComments } from './commentSearchService'; // Adjust the import path as necessary
import { mockComments } from '../../../tests/mocks/mockComments';

describe('searchComments', () => {
  it('should return comments that match the keyword', () => {
    const keyword = 'great';
    const result = searchComments(mockComments, keyword);
    expect(result.length).toBe(1);
    expect(result[0].content).toBe('This is a great video!');
  });

  it('should return comments with parents if child matches the keyword', () => {
    const keyword = 'agree';
    const result = searchComments(mockComments, keyword);
    expect(result.length).toBe(2);
    expect(result.find((comment) => comment.content === 'This is a great video!')).toBeTruthy();
    expect(
      result.find((comment) => comment.content === 'I completely agree with the points made.')
    ).toBeTruthy();
  });

  it('should return comments that match the keyword fuzzily', () => {
    const keyword = 'explanatin'; // 10-character misspelling
    const result = searchComments(mockComments, keyword);
    expect(result.length).toBe(2);
    expect(
      result.find((comment) => comment.content === 'Thanks for the detailed explanation.')
    ).toBeTruthy();
    expect(
      result.find((comment) => comment.content === 'This explanation cleared all my doubts.')
    ).toBeTruthy();
  });

  it('should return comments sorted with parents above children', () => {
    const keyword = 'explanation';
    const result = searchComments(mockComments, keyword);
    expect(result.length).toBe(2);
    expect(result[0].content).toBe('Thanks for the detailed explanation.');
    expect(result[1].content).toBe('This explanation cleared all my doubts.');
  });

  it('should return an empty array if no comments match the keyword', () => {
    const keyword = 'nonexistent';
    const result = searchComments(mockComments, keyword);
    expect(result.length).toBe(0);
  });

  it('should handle an empty list of comments', () => {
    const keyword = 'great';
    const result = searchComments([], keyword);
    expect(result.length).toBe(0);
  });

  it('should handle a keyword that results in exact matches and fuzzy matches', () => {
    const keyword = 'explnation'; // Misspelling to test fuzzy matching
    const result = searchComments(mockComments, keyword);
    expect(result.length).toBe(2);
    expect(
      result.find((comment) => comment.content === 'Thanks for the detailed explanation.')
    ).toBeTruthy();
    expect(
      result.find((comment) => comment.content === 'This explanation cleared all my doubts.')
    ).toBeTruthy();
  });
});
