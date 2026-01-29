// This script is injected into the main world to control the YouTube player
// It listens for messages from the content script (extension)

window.addEventListener('message', (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

  if (event.data.type === 'YCN_SEEK_TO') {
    const player = document.querySelector('#movie_player');
    if (player && typeof player.seekTo === 'function') {
      const seconds = Number(event.data.seconds);
      if (!isNaN(seconds)) {
        player.seekTo(seconds, true);
      }
    }
  }
});
