/**
 * Formats a duration into a human-readable string (e.g., "1h 5m 10s", "5m 10s", or "10s").
 * @param duration Can be a number of seconds or a duration object { hours, minutes, seconds }
 */
export function formatDuration(
  duration: number | { hours?: number; minutes?: number; seconds?: number } | null | undefined
): string {
  if (duration === null || duration === undefined) return "—";

  let h = 0, m = 0, s = 0;

  if (typeof duration === "number") {
    if (duration <= 0) return "0s";
    h = Math.floor(duration / 3600);
    m = Math.floor((duration % 3600) / 60);
    s = Math.floor(duration % 60);
  } else {
    h = duration.hours || 0;
    m = duration.minutes || 0;
    s = duration.seconds || 0;
    if (h === 0 && m === 0 && s === 0) return "—";
  }

  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
}
