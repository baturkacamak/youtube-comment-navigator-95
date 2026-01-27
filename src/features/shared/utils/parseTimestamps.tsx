import React from 'react';

interface ParseTimestampsProps {
  content: (string | JSX.Element)[];
  handleTimestampClick: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  timestampColor?: string; // Added prop for timestamp color
}

export const parseTimestamps = ({
  content,
  handleTimestampClick,
  timestampColor = 'text-blue-500', // Default color
}: ParseTimestampsProps) => {
  const timestampRegex = /\b(\d{1,3}):([0-5]\d):([0-5]\d)\b|\b(\d{1,3}):([0-5]\d)\b/g;
  const elements: (JSX.Element | string)[] = [];

  content.forEach((part, index) => {
    if (typeof part === 'string') {
      let lastIndex = 0;
      let match;
      while ((match = timestampRegex.exec(part)) !== null) {
        // Push preceding text
        if (match.index > lastIndex) {
          elements.push(part.slice(lastIndex, match.index));
        }

        // Push timestamp link
        const timestamp = match[0];
        elements.push(
          <button
            key={`${index}-${match.index}`}
            type="button"
            data-timestamp={timestamp}
            onClick={(e) => handleTimestampClick(e as any)}
            className={`${timestampColor} hover:underline bg-transparent border-none cursor-pointer p-0 inline font-inherit`} // Use the timestampColor prop
          >
            {timestamp}
          </button>
        );

        lastIndex = match.index + timestamp.length;
      }

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
