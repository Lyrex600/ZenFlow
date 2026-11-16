/** A user counts as online when their last heartbeat is at most this old. */
export const ONLINE_WINDOW_MS = 60_000;

/** `now` should come from the server so a skewed client clock cannot flip statuses. */
export function isOnline(lastSeenAt: string | null | undefined, now: number): boolean {
  if (!lastSeenAt) return false;
  const seen = Date.parse(lastSeenAt);
  if (Number.isNaN(seen)) return false;
  return now - seen <= ONLINE_WINDOW_MS;
}
