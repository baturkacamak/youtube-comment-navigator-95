import { AIProviderError } from '@baturkacamak/extension-ai-core';
import { describeAIExecutionError } from './aiErrorDiagnostics';

describe('describeAIExecutionError', () => {
  it('exposes the last provider reason for diagnosis and UI feedback', () => {
    const error = new AIProviderError([
      { providerId: 'local', error: new Error('Built-in model unavailable.') },
      { providerId: 'gemini-api', error: new Error('Quota exceeded.') },
    ]);

    const report = describeAIExecutionError(error, 'private prompt');

    expect(report.displayMessage).toBe('AI analysis failed (gemini-api): Quota exceeded.');
    expect(report.failures).toEqual([
      expect.objectContaining({ providerId: 'local', errorMessage: 'Built-in model unavailable.' }),
      expect.objectContaining({ providerId: 'gemini-api', errorMessage: 'Quota exceeded.' }),
    ]);
  });

  it('redacts prompts and API keys from diagnostic messages', () => {
    const key = 'AIza1234567890abcdefghijklmnop';
    const prompt = 'private prompt contents';
    const error = new AIProviderError([
      { providerId: 'gemini-api', error: new Error(`Failed for ${prompt} with ${key}`) },
    ]);

    const report = describeAIExecutionError(error, prompt);
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain(prompt);
    expect(serialized).not.toContain(key);
    expect(serialized).toContain('[REDACTED_PROMPT]');
    expect(serialized).toContain('[REDACTED_API_KEY]');
  });
});
