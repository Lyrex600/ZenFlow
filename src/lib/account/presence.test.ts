import { describe, expect, it } from "vitest";
import { isOnline } from "./presence";

const NOW = Date.parse("2026-01-10T12:00:00Z");

describe("isOnline", () => {
  it("is online when the last heartbeat is within 60 seconds", () => {
    expect(isOnline("2026-01-10T11:59:01Z", NOW)).toBe(true);
    expect(isOnline("2026-01-10T11:59:00Z", NOW)).toBe(true);
  });
  it("is offline after 60 seconds without a heartbeat", () => {
    expect(isOnline("2026-01-10T11:58:59Z", NOW)).toBe(false);
  });
  it("is offline when the user was never seen", () => {
    expect(isOnline(null, NOW)).toBe(false);
    expect(isOnline("not a date", NOW)).toBe(false);
  });
});
