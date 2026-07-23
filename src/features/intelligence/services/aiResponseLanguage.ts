import { languageOptions } from '../../shared/utils/appConstants';

export const FOLLOW_INTERFACE_LANGUAGE = 'interface';

const normalizeLanguageCode = (language: string): string =>
  language.trim().toLowerCase().split('-')[0];

export const resolveAIResponseLanguage = (
  configuredLanguage: string,
  interfaceLanguage: string
): { code: string; label: string } => {
  const requestedCode =
    configuredLanguage === FOLLOW_INTERFACE_LANGUAGE
      ? normalizeLanguageCode(interfaceLanguage)
      : normalizeLanguageCode(configuredLanguage);
  const option = languageOptions.find(({ value }) => value === requestedCode);
  const fallback = languageOptions.find(({ value }) => value === 'en') ?? languageOptions[0];
  const resolved = option ?? fallback;
  return { code: resolved.value, label: resolved.label };
};

export const appendAIResponseLanguageInstruction = (
  prompt: string,
  configuredLanguage: string,
  interfaceLanguage: string
): string => {
  const language = resolveAIResponseLanguage(configuredLanguage, interfaceLanguage);
  return `${prompt}\n\nResponse language requirements:\n- Respond in ${language.label} (language code: ${language.code}).\n- Keep any explicitly required response-format labels and structural keys exactly as specified in the original instructions; translate only their human-readable values and content.`;
};
