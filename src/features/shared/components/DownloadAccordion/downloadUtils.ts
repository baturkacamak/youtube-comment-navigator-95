import { getVideoTitle } from '../../utils/getVideoTitle';
import { extractYouTubeVideoIdFromUrl } from '../../utils/extractYouTubeVideoIdFromUrl';
import { DownloadFormat, DownloadScope, ContentType } from './types';

/**
 * Generate a filename for the download
 */
export const generateFileName = (
  contentType: ContentType,
  format: DownloadFormat,
  scope: DownloadScope,
  customPrefix?: string
): string => {
  const prefix = customPrefix || contentType;
  const videoTitle = getVideoTitle();
  const videoId = extractYouTubeVideoIdFromUrl();
  const date = new Date().toISOString().split('T')[0];
  const name = videoTitle
    ? videoTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
    : videoId || date;
  const scopeSuffix = scope === 'all' ? '-all' : '';

  return `${prefix}-${name}${scopeSuffix}.${format}`;
};

/**
 * Trigger file download in the browser
 */
const triggerDownload = (content: string, fileName: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Download data as a text file
 */
export const downloadAsText = (
  data: unknown,
  fileName: string,
  formatTextContent?: (data: unknown) => string
): void => {
  let content: string;

  if (formatTextContent) {
    content = formatTextContent(data);
  } else if (typeof data === 'string') {
    content = data;
  } else if (Array.isArray(data)) {
    // For arrays of objects (comments/bookmarks), create a readable text format
    content = data
      .map((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          const author = obj.author || obj.authorDisplayName || 'Unknown';
          const text = obj.text || obj.textOriginal || obj.message || '';
          const likes = obj.likeCount !== undefined ? ` [${obj.likeCount} likes]` : '';
          return `[${index + 1}] ${author}${likes}:\n${text}`;
        }
        return String(item);
      })
      .join('\n\n---\n\n');
  } else {
    content = JSON.stringify(data, null, 2);
  }

  triggerDownload(content, fileName, 'text/plain;charset=utf-8');
};

/**
 * Download data as a JSON file
 */
export const downloadAsJSON = (data: unknown, fileName: string): void => {
  const content = JSON.stringify(data, null, 2);
  triggerDownload(content, fileName, 'application/json;charset=utf-8');
};

/**
 * Download data as a CSV file
 */
export const downloadAsCSV = (data: unknown, fileName: string): void => {
  if (!Array.isArray(data) || data.length === 0) {
    return;
  }

  // Get all unique keys from all objects
  const allKeys = new Set<string>();
  data.forEach((item) => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach((key) => allKeys.add(key));
    }
  });

  const headers = Array.from(allKeys);
  const headerRow = headers.join(',');

  const rows = data.map((item) => {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      return headers
        .map((header) => {
          const value = obj[header];
          if (value === null || value === undefined) {
            return '""';
          }
          // Escape double quotes and wrap in quotes
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        })
        .join(',');
    }
    return `"${String(item).replace(/"/g, '""')}"`;
  });

  const content = [headerRow, ...rows].join('\n');
  triggerDownload(content, fileName, 'text/csv;charset=utf-8');
};

/**
 * Execute download based on format
 */
export const executeDownload = (
  data: unknown,
  format: DownloadFormat,
  fileName: string,
  formatTextContent?: (data: unknown) => string
): void => {
  switch (format) {
    case 'txt':
      downloadAsText(data, fileName, formatTextContent);
      break;
    case 'json':
      downloadAsJSON(data, fileName);
      break;
    case 'csv':
      downloadAsCSV(data, fileName);
      break;
  }
};
