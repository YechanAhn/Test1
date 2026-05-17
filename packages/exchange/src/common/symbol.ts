/**
 * 통일 심볼 포맷: `BASE/QUOTE:SETTLE` (USDT perp 예: `BTC/USDT:USDT`).
 * 거래소별 표기로 변환/역변환.
 */

const UNIFIED_RE = /^([A-Z0-9]+)\/([A-Z0-9]+):([A-Z0-9]+)$/;

export function parseUnified(s: string): { base: string; quote: string; settle: string } {
  const m = UNIFIED_RE.exec(s);
  if (!m) throw new Error(`invalid unified symbol: ${s}`);
  return { base: m[1]!, quote: m[2]!, settle: m[3]! };
}

export const binance = {
  fromUnified(unified: string): string {
    const { base, quote } = parseUnified(unified);
    return `${base}${quote}`;
  },
  toUnified(native: string): string {
    // Binance USDT-M perp: 'BTCUSDT' → 'BTC/USDT:USDT'
    if (native.endsWith("USDT")) {
      const base = native.slice(0, -4);
      return `${base}/USDT:USDT`;
    }
    if (native.endsWith("USD")) {
      const base = native.slice(0, -3);
      return `${base}/USD:USD`;
    }
    throw new Error(`unknown binance symbol: ${native}`);
  },
};

export const bybit = {
  fromUnified(unified: string): string {
    const { base, quote } = parseUnified(unified);
    return `${base}${quote}`;
  },
  toUnified(native: string): string {
    if (native.endsWith("USDT")) {
      const base = native.slice(0, -4);
      return `${base}/USDT:USDT`;
    }
    if (native.endsWith("USD")) {
      const base = native.slice(0, -3);
      return `${base}/USD:USD`;
    }
    throw new Error(`unknown bybit symbol: ${native}`);
  },
};
