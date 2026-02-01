/**
 * Determines the appropriate user-facing error message based on the transcript error type
 */
export function getTranscriptFetchErrorMessage(error: any): string {
  if (!error) {
    return 'Failed to load transcript';
  }

  const errorMessage = error.message || String(error);
  const errorString = errorMessage.toLowerCase();

  // Transcript not available
  if (
    errorString.includes('caption tracks not found') ||
    errorString.includes('transcript base url not found') ||
    errorString.includes('not found') ||
    errorString.includes('unavailable') ||
    errorString.includes('captions') ||
    errorString.includes('no transcript')
  ) {
    return 'Transcript not available for this video';
  }

  // Language-specific errors
  if (errorString.includes('language') || errorString.includes('lang')) {
    return 'No transcript in selected language';
  }

  // Network errors
  if (
    errorString.includes('network') ||
    errorString.includes('fetch failed') ||
    errorString.includes('failed to fetch') ||
    error.name === 'TypeError'
  ) {
    return 'Failed to load transcript. Check your connection.';
  }

  // Parsing errors
  if (errorString.includes('parse') || errorString.includes('json')) {
    return 'Failed to load transcript. Try again.';
  }

  // Default message
  return 'Failed to load transcript. Try again.';
}

/**
 * Checks if the error should show a toast notification
 */
export function shouldShowTranscriptErrorToast(_error: any): boolean {
  // Always show transcript errors (they're less frequent than comment errors)
  return true;
}
