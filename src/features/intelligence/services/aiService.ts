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
import {
  buildCommentSummaryPrompt,
  buildConsensusAndDebatePrompt,
  buildCorrectionsAndWarningsPrompt,
  buildKeyTakeawaysPrompt,
  buildQuestionsAndAnswersPrompt,
  buildTipsAndResourcesPrompt,
} from './consumerAnalysisPrompts';

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
  return executePrompt('comment-summary', buildCommentSummaryPrompt(commentText), signal);
};

export const extractKeyTakeaways = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  return executePrompt('key-takeaways', buildKeyTakeawaysPrompt(commentText), signal);
};

export const answerQuestionsFromComments = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  return executePrompt(
    'questions-and-answers',
    buildQuestionsAndAnswersPrompt(commentText),
    signal
  );
};

export const extractTipsAndResources = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  return executePrompt('tips-and-resources', buildTipsAndResourcesPrompt(commentText), signal);
};

export const analyzeConsensusAndDebate = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  return executePrompt('consensus-and-debate', buildConsensusAndDebatePrompt(commentText), signal);
};

export const extractCorrectionsAndWarnings = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  return executePrompt(
    'corrections-and-warnings',
    buildCorrectionsAndWarningsPrompt(commentText),
    signal
  );
};
