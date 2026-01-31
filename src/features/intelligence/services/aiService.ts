import { Comment } from '../../../types/commentTypes';

const formatCommentsForPrompt = (comments: Comment[], limit = 50): string => {
  return [...comments]
    .sort((a, b) => b.likes - a.likes)
    .slice(0, limit)
    .map((c) => `- ${c.content}`)
    .join('\n');
};

const executePrompt = async (prompt: string, apiKey?: string): Promise<string> => {
  // 1. Try Local Gemini Nano
  if (window.ai && window.ai.languageModel) {
    try {
      const capabilities = await window.ai.languageModel.capabilities();
      if (capabilities.available !== 'no') {
        const session = await window.ai.languageModel.create();
        const result = await session.prompt(prompt);
        return result;
      }
    } catch (e) {
      console.warn('Local AI failed, falling back...', e);
    }
  }

  // 2. Try API Key (Gemini)
  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to get response from API.';
    } catch (e) {
      console.error('API request failed:', e);
      throw new Error('Failed to fetch from API.');
    }
  }

  throw new Error('No AI model available. Enable Chrome AI or provide an API key.');
};

export const summarizeComments = async (comments: Comment[], apiKey?: string): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Here are the top comments from a YouTube video. Summarize the main topics, overall sentiment, and any recurring arguments or jokes. Keep it concise (under 200 words).\n\n${commentText}`;
  return executePrompt(prompt, apiKey);
};

export const analyzeSentiment = async (comments: Comment[], apiKey?: string): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Analyze the sentiment of these comments. Provide the response in this exact format:
  Vibe: [3 adjectives, comma separated]
  Score: [0-100 number only, where 0 is negative, 100 is positive]
  Explanation: [One sentence explaining the general mood]
  
  Comments:
  ${commentText}`;
  return executePrompt(prompt, apiKey);
};

export const extractQuestions = async (comments: Comment[], apiKey?: string): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Identify valid, unanswered questions from these comments. Ignore rhetorical questions. Return a bulleted list of the top 3-5 questions. If none, say "No clear questions found."\n\n${commentText}`;
  return executePrompt(prompt, apiKey);
};

export const extractIdeas = async (comments: Comment[], apiKey?: string): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Identify feature requests, video ideas, or constructive feedback. Return a bulleted list of the top 3-5 suggestions. If none, say "No specific ideas found."\n\n${commentText}`;
  return executePrompt(prompt, apiKey);
};

export const analyzeControversy = async (comments: Comment[], apiKey?: string): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Identify if there is any controversy or debate in these comments. If yes, summarize the opposing viewpoints in 2-3 sentences. If everyone agrees, say "Low controversy."\n\n${commentText}`;
  return executePrompt(prompt, apiKey);
};

export const analyzeAudience = async (comments: Comment[], apiKey?: string): Promise<string> => {
  const commentText = formatCommentsForPrompt(comments);
  const prompt = `Based on the language, jargon, and topics, describe the likely audience profile (e.g., 'Beginners', 'Industry Experts', 'Angry Gamers') in 2 sentences.\n\n${commentText}`;
  return executePrompt(prompt, apiKey);
};
