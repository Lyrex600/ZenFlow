import { describe, expect, it } from "vitest";
import { cookieMaxAge, pickToken } from "./admin-session";

describe("admin gate cookie lifetime", () => {
  it("lasts exactly until the access token expires", () => {
    expect(cookieMaxAge(1_700_003_600, 1_700_000_000)).toBe(3600);
  });
  it("is zero for an expired or missing expiry", () => {
    expect(cookieMaxAge(100, 200)).toBe(0);
    expect(cookieMaxAge(undefined, 200)).toBe(0);
  });
});

describe("admin gate token source", () => {
  it("prefers the bearer header over the cookie", () => {
    expect(pickToken("Bearer header.tok.en", "cookie.tok.en")).toBe("header.tok.en");
  });
  it("falls back to the cookie on a full page load", () => {
    expect(pickToken(null, "cookie.tok.en")).toBe("cookie.tok.en");
  });
  it("returns null with neither, so the page answers 404", () => {
    expect(pickToken(undefined, undefined)).toBeNull();
    expect(pickToken("Basic abc", "")).toBeNull();
  });
});
