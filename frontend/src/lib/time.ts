/**
 * Returns a human-readable relative time string for a given timestamp.
 * Accepts ISO strings or SQLite datetime strings ("YYYY-MM-DD HH:MM:SS").
 */
export function formatRelativeTime(timestamp: string): string {
  // SQLite stores datetimes without a timezone suffix; treat as UTC.
  const normalized = timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T') + 'Z';
  const diffMs = Date.now() - new Date(normalized).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60)  return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)  return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)   return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
