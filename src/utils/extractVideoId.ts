// src/utils/extractVideoId.ts
export const extractVideoId = (): string | null => {
    const url = window.location.href;
    const videoIdMatch = url.match(/[?&]v=([^&]+)/);
    return videoIdMatch ? videoIdMatch[1] : null;
};
