import { AIProviderError } from '@baturkacamak/extension-ai-core';

export interface AIProviderDiagnostic {
  providerId: string;
  errorName: string;
  errorMessage: string;
  errorCode?: string | number;
  httpStatus?: string | number;
}

export interface AIExecutionErrorReport {
  displayMessage: string;
  failures: AIProviderDiagnostic[];
}

const redact = (message: string, prompt: string): string => {
  let safeMessage = message.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]');
  if (prompt) safeMessage = safeMessage.split(prompt).join('[REDACTED_PROMPT]');
  return safeMessage.slice(0, 1000);
};

const describeFailure = (
  providerId: string,
  error: unknown,
  prompt: string
): AIProviderDiagnostic => {
  if (!(error instanceof Error)) {
    return { providerId, errorName: 'UnknownError', errorMessage: 'Unknown provider failure.' };
  }

  const candidate = error as Error & { code?: unknown; status?: unknown };
  const diagnostic: AIProviderDiagnostic = {
    providerId,
    errorName: error.name,
    errorMessage: redact(error.message, prompt),
  };
  if (typeof candidate.code === 'string' || typeof candidate.code === 'number') {
    diagnostic.errorCode = candidate.code;
  }
  if (typeof candidate.status === 'string' || typeof candidate.status === 'number') {
    diagnostic.httpStatus = candidate.status;
  }
  return diagnostic;
};

export const describeAIExecutionError = (
  error: unknown,
  prompt: string
): AIExecutionErrorReport => {
  const failures =
    error instanceof AIProviderError
      ? error.failures.map(({ providerId, error: providerError }) =>
          describeFailure(providerId, providerError, prompt)
        )
      : [describeFailure('unknown', error, prompt)];
  const lastFailure = failures.at(-1);
  const detail = lastFailure?.errorMessage;
  const displayMessage = detail
    ? `AI analysis failed (${lastFailure.providerId}): ${detail}`
    : error instanceof Error
      ? error.message
      : 'Analysis failed.';

  return { displayMessage, failures };
};
