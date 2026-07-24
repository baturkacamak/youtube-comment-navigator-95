import { AIEngine, type AIAvailability, type AIProvider } from '@baturkacamak/extension-ai-core';
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
import { buildAnalysisPromptMaterial } from './analysisSourceMaterial';
import type { AnalysisInput, ResolvedAnalysisSource } from '../types/analysis';

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

const executeAnalysis = (
  operation: string,
  input: AnalysisInput,
  automaticSource: ResolvedAnalysisSource,
  buildPrompt: (material: ReturnType<typeof buildAnalysisPromptMaterial>) => string,
  signal?: AbortSignal
): Promise<string> =>
  executePrompt(
    operation,
    buildPrompt(buildAnalysisPromptMaterial(input, automaticSource)),
    signal
  );

export const summarizeComments = (input: AnalysisInput, signal?: AbortSignal): Promise<string> =>
  executeAnalysis('comment-summary', input, 'comments', buildCommentSummaryPrompt, signal);

export const extractKeyTakeaways = (input: AnalysisInput, signal?: AbortSignal): Promise<string> =>
  executeAnalysis('key-takeaways', input, 'combined', buildKeyTakeawaysPrompt, signal);

export const answerQuestionsFromComments = (
  input: AnalysisInput,
  signal?: AbortSignal
): Promise<string> =>
  executeAnalysis(
    'questions-and-answers',
    input,
    'combined',
    buildQuestionsAndAnswersPrompt,
    signal
  );

export const extractTipsAndResources = (
  input: AnalysisInput,
  signal?: AbortSignal
): Promise<string> =>
  executeAnalysis('tips-and-resources', input, 'combined', buildTipsAndResourcesPrompt, signal);

export const analyzeConsensusAndDebate = (
  input: AnalysisInput,
  signal?: AbortSignal
): Promise<string> =>
  executeAnalysis('consensus-and-debate', input, 'comments', buildConsensusAndDebatePrompt, signal);

export const extractCorrectionsAndWarnings = (
  input: AnalysisInput,
  signal?: AbortSignal
): Promise<string> =>
  executeAnalysis(
    'corrections-and-warnings',
    input,
    'combined',
    buildCorrectionsAndWarningsPrompt,
    signal
  );
