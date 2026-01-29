export type ContentType = 'transcript' | 'livechat' | 'comments' | 'bookmarks';
export type DownloadFormat = 'txt' | 'json' | 'csv';
export type DownloadScope = 'visible' | 'all';

export interface DownloadOption {
  label: string;
  value: string;
}

export interface DownloadAccordionProps {
  /** Type of content being downloaded - determines available formats */
  contentType: ContentType;
  /** Currently visible/filtered data to export */
  visibleData: unknown;
  /** All data (optional) - can be static data or async function to fetch */
  allData?: unknown | (() => Promise<unknown>);
  /** Prefix for the downloaded filename */
  fileNamePrefix?: string;
  /** Custom function to format data as text (for transcript/livechat) */
  formatTextContent?: (data: unknown) => string;
}

/** Configuration for each content type's available formats */
export interface FormatConfig {
  default: DownloadFormat;
  available: DownloadFormat[];
}

/** Format configurations by content type */
export const FORMAT_CONFIG: Record<ContentType, FormatConfig> = {
  transcript: {
    default: 'txt',
    available: ['txt', 'json'],
  },
  livechat: {
    default: 'txt',
    available: ['txt', 'json'],
  },
  comments: {
    default: 'json',
    available: ['json', 'csv', 'txt'],
  },
  bookmarks: {
    default: 'json',
    available: ['json', 'csv', 'txt'],
  },
};
