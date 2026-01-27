export const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  const minutes = m < 10 ? `0${m}` : m;
  const secs = s < 10 ? `0${s}` : s;

  return `${minutes}:${secs}`;
};
