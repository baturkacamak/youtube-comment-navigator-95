import React from 'react';
import { findTimestamps } from './timestamps';

interface ParseTimestampsProps {
  content: (string | JSX.Element)[];
  handleTimestampClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  timestampColor?: string; // Added prop for timestamp color
}

export const parseTimestamps = ({
  content,
  handleTimestampClick,
  timestampColor = 'text-blue-500', // Default color
}: ParseTimestampsProps) => {
  const elements: (JSX.Element | string)[] = [];

  content.forEach((part, index) => {
    if (typeof part === 'string') {
      let lastIndex = 0;
      findTimestamps(part).forEach((match) => {
        // Push preceding text
        if (match.index > lastIndex) {
          elements.push(part.slice(lastIndex, match.index));
        }

        // Push timestamp link
        const timestamp = match.value;
        elements.push(
          <button
            key={`${index}-${match.index}`}
            type="button"
            data-timestamp={timestamp}
            onClick={handleTimestampClick}
            className={`${timestampColor} hover:underline bg-transparent border-none cursor-pointer p-0 inline font-inherit`} // Use the timestampColor prop
          >
            {timestamp}
          </button>
        );

        lastIndex = match.index + timestamp.length;
      });

      // Push remaining text
      if (lastIndex < part.length) {
        elements.push(part.slice(lastIndex));
      }
    } else {
      elements.push(part);
    }
  });

  return elements;
};
