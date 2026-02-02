import React from 'react';
import { normalizeString } from './normalizeString';

/**
 * Highlights the given text by wrapping the specified keyword with a span element having a highlight class and an icon.
 * @param text - The text to search within.
 * @param highlight - The keyword to highlight.
 * @returns The text with highlighted keyword.
 */
export const highlightText = (
  text: string | (string | JSX.Element)[],
  highlight: string
): (string | JSX.Element)[] => {
  if (!highlight.trim()) {
    return typeof text === 'string' ? [text] : text;
  }

  const normalizedHighlight = normalizeString(highlight);

  const createHighlightedPart = (key: string, content: string) => (
    <span
      key={key}
      className="relative font-bold text-red-500 inline-flex items-center p-0 py-1 transition-colors duration-500 ease-in-out"
    >
      {content}
      <span className="absolute left-0 bottom-0 h-1 w-full bg-linear-to-r from-red-400 to-red-600 rounded-full animate-highlight-bar" />
    </span>
  );

  const processPart = (part: string | JSX.Element, i: number): (string | JSX.Element)[] => {
    if (typeof part === 'string') {
      const normalizedPart = normalizeString(part);
      const splitPart = part.split('');
      const indices: number[] = [];

      let startIndex = 0;
      while ((startIndex = normalizedPart.indexOf(normalizedHighlight, startIndex)) !== -1) {
        indices.push(startIndex);
        startIndex += normalizedHighlight.length;
      }

      if (indices.length === 0) {
        return [part];
      }

      const result: (string | JSX.Element)[] = [];
      let lastIndex = 0;

      indices.forEach((index, idx) => {
        result.push(splitPart.slice(lastIndex, index).join(''));
        result.push(
          createHighlightedPart(
            `${i}-${idx}`,
            splitPart.slice(index, index + normalizedHighlight.length).join('')
          )
        );
        lastIndex = index + normalizedHighlight.length;
      });

      result.push(splitPart.slice(lastIndex).join(''));
      return result;
    }
    return [part];
  };

  const result = typeof text === 'string' ? [text].map(processPart) : text.map(processPart);

  return result.flat();
};
