// Type definitions for Chrome's experimental AI API
export interface AIModelCapabilities {
  available: 'readily' | 'after-download' | 'no';
  defaultTemperature?: number;
  defaultTopK?: number;
  maxTopK?: number;
}

export interface AILanguageModel {
  prompt: (input: string) => Promise<string>;
  promptStreaming: (input: string) => ReadableStream<string>;
  countPromptTokens: (input: string) => Promise<number>;
  maxTokens: number;
  tokensLeft: number;
  topK: number;
  temperature: number;
}

export interface AILanguageModelFactory {
  capabilities: () => Promise<AIModelCapabilities>;
  create: (options?: {
    systemPrompt?: string;
    temperature?: number;
    topK?: number;
  }) => Promise<AILanguageModel>;
}

declare global {
  interface Window {
    ai?: {
      languageModel?: AILanguageModelFactory;
    };
  }
}
