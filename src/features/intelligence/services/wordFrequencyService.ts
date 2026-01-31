import { Comment } from '../../../types/commentTypes';

export interface WordFrequency {
  text: string;
  value: number;
}

const STOP_WORDS = new Set([
  'the',
  'be',
  'to',
  'of',
  'and',
  'a',
  'in',
  'that',
  'have',
  'i',
  'it',
  'for',
  'not',
  'on',
  'with',
  'he',
  'as',
  'you',
  'do',
  'at',
  'this',
  'but',
  'his',
  'by',
  'from',
  'they',
  'we',
  'say',
  'her',
  'she',
  'or',
  'an',
  'will',
  'my',
  'one',
  'all',
  'would',
  'there',
  'their',
  'what',
  'so',
  'up',
  'out',
  'if',
  'about',
  'who',
  'get',
  'which',
  'go',
  'me',
  'when',
  'make',
  'can',
  'like',
  'time',
  'no',
  'just',
  'know',
  'take',
  'person',
  'into',
  'year',
  'your',
  'good',
  'some',
  'could',
  'them',
  'see',
  'other',
  'than',
  'then',
  'now',
  'look',
  'only',
  'come',
  'its',
  'over',
  'think',
  'also',
  'back',
  'after',
  'use',
  'two',
  'how',
  'our',
  'work',
  'first',
  'well',
  'way',
  'even',
  'new',
  'want',
  'because',
  'any',
  'these',
  'give',
  'day',
  'most',
  'us',
  // Common video/comment filler
  'video',
  'comment',
  'subscribe',
  'channel',
  'thanks',
  'thank',
  'love',
  'great',
  'awesome',
  'amazing',
  'really',
  'very',
]);

export const calculateWordFrequency = (
  comments: Comment[],
  limit: number = 50
): WordFrequency[] => {
  const frequencyMap: Record<string, number> = {};

  comments.forEach((comment) => {
    // Basic tokenization: lower case, remove punctuation, split by whitespace
    const words = comment.content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);

    words.forEach((word: string) => {
      if (word.length > 3 && !STOP_WORDS.has(word)) {
        frequencyMap[word] = (frequencyMap[word] || 0) + 1;
      }
    });
  });

  return Object.entries(frequencyMap)
    .filter(([, value]) => value >= 2)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};
