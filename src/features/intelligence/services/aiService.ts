import { Comment } from '../../../types/commentTypes';

export const summarizeComments = async (comments: Comment[], apiKey?: string): Promise<string> => {
  // Take top 50 comments by likes to summarize
  const topComments = [...comments]
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 50)
    .map((c) => `- ${c.content}`)
    .join('\n');

  const prompt = `Here are the top comments from a YouTube video. Summarize the main topics, overall sentiment, and any recurring arguments or jokes. Keep it concise (under 200 words).\n\n${topComments}`;

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
      throw new Error('Failed to fetch summary from API.');
    }
  }

  throw new Error('No AI model available. Enable Chrome AI or provide an API key.');
};
