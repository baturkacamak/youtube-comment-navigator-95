import { MouseEvent } from 'react';

const handleClickTimestamp = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const timestamp = event.currentTarget.getAttribute('data-timestamp');
    if (timestamp) {
        const player = document.querySelector('#movie_player') as any;
        if (player && typeof player.seekTo === 'function') {
            const timeParts = timestamp.split(':').map(Number);
            const seconds = timeParts.reduce((acc, part) => acc * 60 + part, 0);
            player.seekTo(seconds, true);
        } else {
            console.error("Player does not have a seekTo method");
        }
    } else {
        console.error("YouTube Player is not available");
    }
};

export default handleClickTimestamp;
