import {
  appendAIResponseLanguageInstruction,
  resolveAIResponseLanguage,
} from './aiResponseLanguage';

describe('AI response language', () => {
  it('follows the interface language by default', () => {
    expect(resolveAIResponseLanguage('interface', 'tr-TR')).toEqual({
      code: 'tr',
      label: 'Türkçe',
    });
  });

  it('uses an explicit override instead of the interface language', () => {
    expect(resolveAIResponseLanguage('es', 'tr')).toEqual({ code: 'es', label: 'Español' });
  });

  it('adds one centralized instruction while preserving required format labels', () => {
    const prompt = appendAIResponseLanguageInstruction('Vibe: ...', 'tr', 'en');

    expect(prompt).toContain('Respond in Türkçe (language code: tr).');
    expect(prompt).toContain('Keep any explicitly required response-format labels');
  });
});
