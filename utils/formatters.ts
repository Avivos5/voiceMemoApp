export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m${secs}s` : `${secs}s`;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};
