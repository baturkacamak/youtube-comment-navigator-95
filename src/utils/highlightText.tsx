import React from 'react';

/**
 * Highlights the given text by wrapping the specified keyword with a span element having a highlight class and an icon.
 * @param text - The text to search within.
 * @param highlight - The keyword to highlight.
 * @returns The text with highlighted keyword.
 */
export const highlightText = (text: string | (string | JSX.Element)[], highlight: string): (string | JSX.Element)[] => {
    if (!highlight.trim()) {
        return typeof text === 'string' ? [text] : text;
    }

    // Escaping special characters for regex
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');

    const createHighlightedPart = (key: string, content: string) => (
        <span
            key={key}
            className="relative font-bold text-red-500 inline-flex items-center p-0 py-1 transition-colors duration-500 ease-in-out"
        >
            {content}
            <span
                className="absolute left-0 bottom-0 h-1 w-full bg-gradient-to-r from-red-400 to-red-600 rounded-full animate-highlight-bar"/>
        </span>
    );

    const processPart = (part: string | JSX.Element, i: number): (string | JSX.Element)[] => {
        if (typeof part === 'string') {
            return part.split(regex).map((subPart, index) =>
                regex.test(subPart) ? createHighlightedPart(`${i}-${index}`, subPart) : subPart
            );
        }
        return [part];
    };

    const result = typeof text === 'string' ? text.split(regex).map(processPart) : text.map(processPart);

    // Flattening the array of arrays
    return result.flat();
};
