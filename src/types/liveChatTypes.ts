/**
 * Types for Live Chat Transcript functionality
 * Separate from Comment types as livechat has different structure and behavior
 */

/**
 * Represents a single live chat message in the transcript
 */
export interface LiveChatMessage {
  // Primary identification
  id?: number; // Auto-incremented primary key in IndexedDB
  messageId: string; // Unique message ID from YouTube API
  videoId: string; // Video this message belongs to

  // Author information
  author: string;
  authorChannelId: string;
  authorAvatarUrl: string;
  isAuthorContentCreator: boolean;

  // Message content
  message: string; // The actual chat message text

  // Timing information
  timestampUsec: string; // Original microsecond timestamp from YouTube
  timestampMs: number; // Timestamp in milliseconds (for sorting and navigation)
  publishedDate: number; // Unix timestamp for compatibility
  published: string; // ISO date string
  videoOffsetTimeSec?: number; // Time offset in video when message was sent (for clickable timestamps)

  // Message metadata
  isMembership?: boolean; // Is a membership message
  isModerator?: boolean; // Is from a moderator
  isVerified?: boolean; // Is from verified user
  isDonation?: boolean; // Is a super chat/donation
  donationAmount?: string; // Amount if donation
  donationCurrency?: string; // Currency code if donation

  // Badges
  badges?: LiveChatBadge[]; // User badges (member, moderator, etc.)

  // Reply information (chat replies are stored as Comments in the database)
  hasReplies?: boolean; // Whether this message has replies
  replyCount?: number; // Number of replies

  // UI state
  isBookmarked?: boolean;
  bookmarkAddedDate?: string;
  note?: string;
}

/**
 * Badge information for chat authors
 */
export interface LiveChatBadge {
  label: string; // Badge label (e.g., "Member", "Moderator")
  iconUrl: string; // Badge icon URL
  tooltipText?: string; // Tooltip on hover
}

/**
 * Reply to a live chat message (stored as Comment in database)
 * This extends the base structure but links to a livechat message
 */
export interface LiveChatReply {
  commentId: string;
  parentMessageId: string; // Links to LiveChatMessage.messageId
  videoId: string;
  author: string;
  content: string;
  publishedDate: number;
  published: string;
  authorAvatarUrl: string;
  authorChannelId: string;
  likes: number;
  isLiveChat: boolean; // Always true for livechat replies
  isLiveChatReply: boolean; // Distinguishes reply from main message
  replyLevel: number; // Always 1 for direct replies to livechat
}

/**
 * Props for LiveChatTranscript component
 */
export interface LiveChatTranscriptProps {
  messages: LiveChatMessage[];
  isLoading: boolean;
  onTimestampClick?: (timestampSeconds: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  fetchAllMessages?: () => Promise<string>;
}

/**
 * Props for individual LiveChatMessage component
 */
export interface LiveChatMessageItemProps {
  message: LiveChatMessage;
  onTimestampClick?: (timestampSeconds: number) => void;
  showReplies?: boolean;
  onToggleReplies?: (messageId: string) => void;
}

/**
 * Filter options for livechat queries
 */
export interface LiveChatFilter {
  includeMembers?: boolean;
  includeModerators?: boolean;
  includeDonations?: boolean;
  includeRegular?: boolean;
  searchTerm?: string;
  startTime?: number; // Filter by timestamp range
  endTime?: number;
}

/**
 * Live chat fetch state
 */
export interface LiveChatFetchState {
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  messageCount: number;
  continuationToken: string | null;
  isReplay: boolean;
  currentVideoOffset?: number;
}

/**
 * Error types for livechat operations
 */
export enum LiveChatErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INVALID_CONTINUATION = 'INVALID_CONTINUATION',
  NO_CHAT_AVAILABLE = 'NO_CHAT_AVAILABLE',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured error for livechat operations
 */
export interface LiveChatError {
  type: LiveChatErrorType;
  message: string;
  originalError?: Error;
  context?: Record<string, unknown>;
  timestamp: number;
}
