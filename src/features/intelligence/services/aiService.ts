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

export const AI_MESSAGE_NAMESPACE = 'YCN_AI';

const builtInProvider = createChromeBuiltInProvider({
  global: window as unknown as BuiltInAIGlobal,
});
let runtimeClient: RuntimeAIClient | null = null;
const getRuntimeClient = (): RuntimeAIClient => {
  if (runtimeClient) return runtimeClient;
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    throw new Error('Extension runtime is unavailable.');
  }
  runtimeClient = createRuntimeAIClient({
    runtime: chrome.runtime,
    namespace: AI_MESSAGE_NAMESPACE,
    providerId: 'gemini-api',
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

const executePrompt = (prompt: string, signal?: AbortSignal): Promise<string> =>
  engine.generate(prompt, { signal });

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
  return executePrompt(prompt, signal);
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
  return executePrompt(prompt, signal);
};

export const extractQuestions = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Identify valid, unanswered questions from these comments. Ignore rhetorical questions. Return a bulleted list of the top 3-5 questions. If none, say "No clear questions found."\n\n${commentText}`;
  return executePrompt(prompt, signal);
};

export const extractIdeas = async (comments: Comment[], signal?: AbortSignal): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Identify feature requests, video ideas, or constructive feedback. Return a bulleted list of the top 3-5 suggestions. If none, say "No specific ideas found."\n\n${commentText}`;
  return executePrompt(prompt, signal);
};

export const analyzeControversy = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Identify if there is any controversy or debate in these comments. If yes, summarize the opposing viewpoints in 2-3 sentences. If everyone agrees, say "Low controversy."\n\n${commentText}`;
  return executePrompt(prompt, signal);
};

export const analyzeAudience = async (
  comments: Comment[],
  signal?: AbortSignal
): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Based on the language, jargon, and topics, describe the likely audience profile (e.g., 'Beginners', 'Industry Experts', 'Angry Gamers') in 2 sentences.\n\n${commentText}`;
  return executePrompt(prompt, signal);
};
