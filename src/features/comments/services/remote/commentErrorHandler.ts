/**
 * Determines the appropriate user-facing error message based on the error type
 */
export function getCommentFetchErrorMessage(error: any): string {
  if (!error) {
    return 'Failed to fetch comments';
  }

  // Abort errors (user cancelled) - don't show toast
  if (error.name === 'AbortError') {
    return '';
  }

  const errorMessage = error.message || String(error);
  const errorString = errorMessage.toLowerCase();

  // Network/connection errors
  if (
    errorString.includes('network') ||
    errorString.includes('fetch failed') ||
    errorString.includes('failed to fetch') ||
    error.name === 'TypeError'
  ) {
    return 'Network error. Check your connection and try again.';
  }

  // Rate limiting
  if (
    errorString.includes('429') ||
    errorString.includes('too many requests') ||
    errorString.includes('rate limit')
  ) {
    return 'Failed to fetch comments. YouTube may be rate limiting requests. Try again later.';
  }

  // Comments disabled
  if (
    errorString.includes('disabled') ||
    errorString.includes('unavailable') ||
    errorString.includes('403')
  ) {
    return 'Video comments are disabled or unavailable.';
  }

  // Auth/permissions errors
  if (errorString.includes('401') || errorString.includes('unauthorized')) {
    return 'Authentication error. Please refresh the YouTube page and try again.';
  }

  // Generic API errors
  if (errorString.includes('youtube api error')) {
    return 'Failed to fetch comments from YouTube. Please try again.';
  }

  // Default message
  return 'Failed to fetch comments. Please try again.';
}

/**
 * Checks if the error should show a toast notification
 */
export function shouldShowErrorToast(error: any): boolean {
  // Don't show toast for abort errors (user cancelled)
  if (error?.name === 'AbortError') {
    return false;
  }
  return true;
}
