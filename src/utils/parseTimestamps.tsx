import React from 'react';

export const parseTimestamps = (
    content: string,
    handleTimestampClick: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void
) => {
    const timestampRegex = /\b(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\b/g;
    const elements: (JSX.Element | string)[] = [];

    let lastIndex = 0;
    let match;
    while ((match = timestampRegex.exec(content)) !== null) {
        // Push preceding text
        if (match.index > lastIndex) {
            elements.push(content.slice(lastIndex, match.index));
        }

        // Push timestamp link
        const timestamp = match[0];
        elements.push(
            <a
                key={match.index}
                href="#"
                data-timestamp={timestamp}
                onClick={handleTimestampClick}
                className="text-blue-500 hover:underline"
            >
                {timestamp}
            </a>
        );

        lastIndex = match.index + timestamp.length;
    }

    // Push remaining text
    if (lastIndex < content.length) {
        elements.push(content.slice(lastIndex));
    }

    return elements;
};
