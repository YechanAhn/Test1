import { createHmac } from "node:crypto";

/** HMAC-SHA256 hex. Binance/Bybit 모두 동일 알고리즘. */
export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** querystring 정규화 — key 알파벳 정렬, undefined 키 제거, primitive 값 직렬화. */
export function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}
