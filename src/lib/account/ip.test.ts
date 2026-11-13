import { describe, expect, it } from "vitest";
import { normalizeIp } from "./ip";

describe("normalizeIp", () => {
  it("keeps the first x-forwarded-for hop", () => {
    expect(normalizeIp("203.0.113.7, 10.0.0.1")).toBe("203.0.113.7");
  });
  it("accepts IPv6", () => {
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8::1");
  });
  it("rejects garbage so it never reaches the database", () => {
    expect(normalizeIp("'; drop table x; --")).toBeNull();
    expect(normalizeIp("999.1.1.1")).toBeNull();
    expect(normalizeIp("")).toBeNull();
  });
});
