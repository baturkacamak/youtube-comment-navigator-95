const KEY = 'youtubeDataApiKey';
const GEMINI_KEY = 'geminiApiKey';
const API = 'https://www.googleapis.com/youtube/v3';

type ApiComment = Record<string, unknown>;
const send = (tabId: number, message: unknown) =>
  chrome.tabs.sendMessage(tabId, message).catch(() => undefined);
const storageGet = async () => (await chrome.storage.local.get(KEY))[KEY] as string | undefined;

function toComment(snippet: any, videoId: string, parentId?: string, replyCount = 0): ApiComment {
  const publishedDate = Date.parse(snippet.publishedAt || '') || Date.now();
  const content = snippet.textDisplay || snippet.textOriginal || '';
  return {
    author: snippet.authorDisplayName || '',
    likes: Number(snippet.likeCount || 0),
    viewLikes: '',
    content,
    published: snippet.publishedAt || '',
    publishedDate,
    authorAvatarUrl: snippet.authorProfileImageUrl || '',
    isAuthorContentCreator: false,
    authorChannelId: snippet.authorChannelId?.value || '',
    replyCount,
    commentId: snippet.id || '',
    commentParentId: parentId || '',
    replyLevel: parentId ? 1 : 0,
    hasTimestamp: /\b\d{1,2}:\d{2}\b/.test(content),
    hasLinks: /https?:\/\//i.test(content),
    videoId,
    wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
    timestamp: Date.now(),
    source: 'dataApi',
  };
}

async function request(path: string, key: string, signal: AbortSignal) {
  const response = await fetch(
    `${API}${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`,
    { signal }
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error(body?.error?.message || `HTTP ${response.status}`), {
      status: response.status,
      reason: body?.error?.errors?.[0]?.reason,
    });
  return body;
}

async function fetchComments(tabId: number, requestId: string, videoId: string) {
  const key = await storageGet();
  if (!key) return send(tabId, { type: 'YCN_YT_API_ERROR', requestId, error: 'missingKey' });
  const controller = new AbortController();
  let quotaUsed = 0;
  let count = 0;
  let pageToken = '';
  try {
    do {
      const data = await request(
        `/commentThreads?part=snippet,replies&videoId=${encodeURIComponent(videoId)}&maxResults=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`,
        key,
        controller.signal
      );
      quotaUsed++;
      pageToken = data.nextPageToken || '';
      const comments: ApiComment[] = [];
      for (const thread of data.items || []) {
        const top = thread.snippet?.topLevelComment;
        if (!top) continue;
        comments.push(
          toComment(
            { ...top.snippet, id: top.id },
            videoId,
            undefined,
            Number(thread.snippet?.totalReplyCount || 0)
          )
        );
        for (const reply of thread.replies?.comments || [])
          comments.push(toComment({ ...reply.snippet, id: reply.id }, videoId, top.id));
      }
      count += comments.length;
      await send(tabId, {
        type: 'YCN_YT_API_CHUNK',
        requestId,
        comments,
        count,
        quotaUsed,
        done: !pageToken,
      });
    } while (pageToken);
  } catch (error: any) {
    await send(tabId, {
      type: 'YCN_YT_API_ERROR',
      requestId,
      error: error?.reason || error?.message || 'unknown',
      count,
      quotaUsed,
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === 'YCN_YT_API_TEST') {
    (async () => {
      const key = typeof message.key === 'string' ? message.key.trim() : await storageGet();
      if (!key) return respond({ ok: false, error: 'Enter an API key first.' });
      try {
        await request('/i18nLanguages?part=snippet&hl=en', key, new AbortController().signal);
        respond({ ok: true });
      } catch (error: any) {
        respond({ ok: false, error: error?.reason || error?.message || 'API key test failed.' });
      }
    })();
    return true;
  }
  if (message?.type === 'YCN_GEMINI_STATUS') {
    chrome.storage.local
      .get(GEMINI_KEY)
      .then((v) => respond({ configured: Boolean(v[GEMINI_KEY]) }));
    return true;
  }
  if (message?.type === 'YCN_GEMINI_KEY_SET') {
    chrome.storage.local
      .set({ [GEMINI_KEY]: message.key?.trim() || '' })
      .then(() => respond({ configured: Boolean(message.key?.trim()) }));
    return true;
  }
  if (message?.type === 'YCN_GEMINI_GENERATE') {
    chrome.storage.local.get(GEMINI_KEY).then(async (v) => {
      const key = typeof v[GEMINI_KEY] === 'string' ? v[GEMINI_KEY] : '';
      if (!key) return respond({ error: 'Gemini API key is not configured.' });
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: message.prompt }] }] }),
          }
        );
        const d = await r.json();
        respond({ result: d.candidates?.[0]?.content?.parts?.[0]?.text, error: d.error?.message });
      } catch {
        respond({ error: 'Failed to fetch from API.' });
      }
    });
    return true;
  }
  if (message?.type === 'YCN_YT_API_STATUS') {
    storageGet().then((key) => respond({ configured: Boolean(key) }));
    return true;
  }
  if (message?.type === 'YCN_YT_API_KEY_SET') {
    chrome.storage.local
      .set({ [KEY]: message.key?.trim() || '' })
      .then(() => respond({ configured: Boolean(message.key?.trim()) }));
    return true;
  }
  if (message?.type === 'YCN_YT_API_FETCH' && sender.tab?.id) {
    void fetchComments(sender.tab.id, message.requestId, message.videoId);
    respond({ started: true });
  }
});
