import { Comment } from '../../../types/commentTypes';
import {
  AIEngine,
  formatTextItems,
  type AIAvailability,
  type AIProvider,
} from '@baturkacamak/extension-ai-core';
import {
  createChromeBuiltInProvider,
  createRuntimeAIClient,
  type BuiltInAIGlobal,
  type RuntimeAIClient,
} from '@baturkacamak/extension-ai-webextension';
import logger from '../../shared/utils/logger';
import { describeAIExecutionError } from './aiErrorDiagnostics';
import { appendAIResponseLanguageInstruction } from './aiResponseLanguage';
import store from '../../../store/store';
import { getSettings } from '../../settings/utils/settingsUtils';

export const AI_MESSAGE_NAMESPACE = 'YCN_AI';

const builtInProvider = createChromeBuiltInProvider({
  global: window as unknown as BuiltInAIGlobal,
});
let runtimeClient: RuntimeAIClient | null = null;
const getRuntimeClient = (): RuntimeAIClient => {
  if (runtimeClient) return runtimeClient;
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    logger.error('AI extension runtime is unavailable.', {
      operation: 'create-runtime-client',
      providerId: 'gemini-api',
    });
    throw new Error('Extension runtime is unavailable.');
  }
  runtimeClient = createRuntimeAIClient({
    runtime: chrome.runtime,
    namespace: AI_MESSAGE_NAMESPACE,
    providerId: 'gemini-api',
    logger,
  });
  return runtimeClient;
};
const runtimeProvider: AIProvider = {
  id: 'gemini-api',
  async availability() {
    if (typeof chrome === 'undefined' || !chrome.runtime) return 'unavailable';
    return getRuntimeClient().provider.availability();
  },
  generate(prompt, options) {
    return getRuntimeClient().provider.generate(prompt, options);
  },
};
const engine = new AIEngine([builtInProvider, runtimeProvider]);

const formatCommentsForPrompt = (comments: Comment[], limit = 50): string => {
  return formatTextItems(
    comments.map((comment) => ({ text: comment.content, weight: comment.likes })),
    { limit }
  );
};

const executePrompt = async (
  operation: string,
  prompt: string,
  signal?: AbortSignal
): Promise<string> => {
  const savedInterfaceLanguage = getSettings().language;
  const interfaceLanguage =
    typeof savedInterfaceLanguage === 'string'
      ? savedInterfaceLanguage
      : navigator.language || navigator.languages?.[0] || 'en';
  const localizedPrompt = appendAIResponseLanguageInstruction(
    prompt,
    store.getState().settings.aiResponseLanguage,
    interfaceLanguage
  );
  try {
    return await engine.generate(localizedPrompt, { signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;

    const report = describeAIExecutionError(error, localizedPrompt);
    logger.error('AI analysis request failed.', {
      operation,
      promptLength: localizedPrompt.length,
      failureCount: report.failures.length,
      providerIds: report.failures.map(({ providerId }) => providerId).join(', '),
    });
    report.failures.forEach((failure) => {
      logger.error('AI provider failed.', { operation, ...failure });
    });

    throw new Error(report.displayMessage);
  }
};

export const getBuiltInAIAvailability = (): Promise<AIAvailability> =>
  builtInProvider.availability();

export const getRemoteAIStatus = () => getRuntimeClient().getStatus();

export const setRemoteAIApiKey = (key: string) => getRuntimeClient().setApiKey(key);

export const summarizeComments = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Here are the top comments from a YouTube video. Summarize the main topics, overall sentiment, and any recurring arguments or jokes. Keep it concise (under 200 words).\n\n${commentText}`;
  return executePrompt('executive-summary', prompt, signal);
};

export const analyzeSentiment = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Analyze the sentiment of these comments. Provide the response in this exact format:
  Vibe: [3 adjectives, comma separated]
  Score: [0-100 number only, where 0 is negative, 100 is positive]
  Explanation: [One sentence explaining the general mood]
  
  Comments:
  ${commentText}`;
  return executePrompt('vibe-check', prompt, signal);
};

export const extractQuestions = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Identify valid, unanswered questions from these comments. Ignore rhetorical questions. Return a bulleted list of the top 3-5 questions. If none, say "No clear questions found."\n\n${commentText}`;
  return executePrompt('smart-qa', prompt, signal);
};

export const extractIdeas = async (comments: Comment[], signal?: AbortSignal): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Identify feature requests, video ideas, or constructive feedback. Return a bulleted list of the top 3-5 suggestions. If none, say "No specific ideas found."\n\n${commentText}`;
  return executePrompt('idea-miner', prompt, signal);
};

export const analyzeControversy = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Identify if there is any controversy or debate in these comments. If yes, summarize the opposing viewpoints in 2-3 sentences. If everyone agrees, say "Low controversy."\n\n${commentText}`;
  return executePrompt('controversy-radar', prompt, signal);
};

export const analyzeAudience = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Based on the language, jargon, and topics, describe the likely audience profile (e.g., 'Beginners', 'Industry Experts', 'Angry Gamers') in 2 sentences.\n\n${commentText}`;
  return executePrompt('audience-profiling', prompt, signal);
};
