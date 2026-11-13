/** Returns a clean IPv4/IPv6 string or null. Only the first x-forwarded-for hop is kept. */
export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim() ?? "";
  if (!first || first.length > 45) return null;
  const v4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  if (v4.test(first)) return first;
  const v6 = /^[0-9a-fA-F:]+(%[0-9a-zA-Z]+)?$/;
  if (first.includes(":") && v6.test(first.replace(/\.\d+\.\d+\.\d+$/, ""))) return first.split("%")[0] ?? null;
  return null;
}
