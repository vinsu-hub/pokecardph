/**
 * One-shot time-remaining label for the Auction OG image — same day/hour/
 * minute breakdown as `Countdown.tsx`'s `format()`, minus seconds (irrelevant
 * for a static image) and minus the live-tick/hydration machinery (this runs
 * once at generation time on the server, never re-renders).
 */
export function timeRemainingLabel(endTime: string, now: Date = new Date()): string {
  const ms = new Date(endTime).getTime() - now.getTime();
  if (ms <= 0) return "Ended";

  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);

  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}
