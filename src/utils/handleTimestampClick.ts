// src/utils/handleTimestampClick.ts

import { MouseEvent } from 'react';

const handleTimestampClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const timestamp = event.currentTarget.getAttribute('data-timestamp');
    if (timestamp && (window as any).yt && (window as any).yt.Player) {
        const player = new (window as any).yt.Player('video-player'); // Replace 'video-player' with your video player ID
        const timeParts = timestamp.split(':').map(Number);
        const seconds = timeParts.reduce((acc, part) => acc * 60 + part, 0);
        player.seekTo(seconds, true);
    }
};

export default handleTimestampClick;
