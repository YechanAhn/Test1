import { describe, it, expect } from "vitest";
import { hmacSha256Hex, toQueryString } from "../common/hmac.js";

describe("hmacSha256Hex", () => {
  it("RFC 호환 결과(고정 벡터)", () => {
    // 알려진 테스트 벡터: key="key", msg="The quick brown fox jumps over the lazy dog"
    // 정답: f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8
    expect(hmacSha256Hex("key", "The quick brown fox jumps over the lazy dog")).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });
});

describe("toQueryString", () => {
  it("undefined 키 제거 + 알파벳 정렬 + URI 인코딩", () => {
    expect(toQueryString({ b: 2, a: "x y", c: undefined, d: true })).toBe("a=x%20y&b=2&d=true");
  });
});
