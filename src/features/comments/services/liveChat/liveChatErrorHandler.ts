/**
 * Determines the appropriate user-facing error message based on the live chat error type
 */
export function getLiveChatFetchErrorMessage(error: any): string {
  if (!error) {
    return 'Failed to load chat messages';
  }

  const errorMessage = error.message || String(error);
  const errorString = errorMessage.toLowerCase();

  // Live chat not available
  if (
    errorString.includes('no live chat continuation') ||
    errorString.includes('not a live stream') ||
    errorString.includes('continuation data missing') ||
    errorString.includes('no continuation') ||
    errorString.includes('not available') ||
    errorString.includes('unavailable')
  ) {
    return "This video doesn't have live chat";
  }

  // Replay-specific errors
  if (
    errorString.includes('replay') ||
    errorString.includes('not a replay') ||
    errorString.includes('playerseek')
  ) {
    return 'Live chat replay not available for this video';
  }

  // Network errors
  if (
    errorString.includes('network') ||
    errorString.includes('fetch failed') ||
    errorString.includes('failed to fetch') ||
    error.name === 'TypeError'
  ) {
    return 'Failed to load chat messages. Check your connection.';
  }

  // API errors
  if (errorString.includes('403') || errorString.includes('forbidden')) {
    return 'Live chat access is restricted for this video';
  }

  // Default message
  return 'Failed to load chat messages';
}

/**
 * Checks if the error should show a toast notification
 */
export function shouldShowLiveChatErrorToast(error: any): boolean {
  // Don't show toast for abort errors
  if (error?.name === 'AbortError') {
    return false;
  }
  return true;
}
