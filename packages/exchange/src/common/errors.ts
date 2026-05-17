export type ExchangeErrorCode =
  | "AUTH"
  | "RATE_LIMIT"
  | "INSUFFICIENT_BALANCE"
  | "INVALID_ORDER"
  | "SYMBOL_UNKNOWN"
  | "NETWORK"
  | "EXCHANGE_5XX"
  | "UNKNOWN";

export class ExchangeError extends Error {
  constructor(
    public readonly code: ExchangeErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ExchangeError";
  }
}

/**
 * Binance/Bybit 의 코드/메시지를 통일 taxonomy 로 분류한다.
 * 추후 어댑터에서 상세 매핑 보완(M2 후반).
 */
export function classifyHttp(status: number, body?: { code?: number | string; msg?: string; retCode?: number }): ExchangeError {
  if (status === 401 || status === 403) return new ExchangeError("AUTH", body?.msg ?? "auth", false, body);
  if (status === 429) return new ExchangeError("RATE_LIMIT", "rate limited", true, body);
  if (status >= 500) return new ExchangeError("EXCHANGE_5XX", `5xx: ${status}`, true, body);

  // Binance 도메인 코드
  if (body?.code === -2010 || body?.code === -2019)
    return new ExchangeError("INSUFFICIENT_BALANCE", body?.msg ?? "no balance", false, body);
  if (body?.code === -1121) return new ExchangeError("SYMBOL_UNKNOWN", "unknown symbol", false, body);

  // Bybit 도메인 코드
  if (body?.retCode === 10001) return new ExchangeError("INVALID_ORDER", "invalid params", false, body);
  if (body?.retCode === 110007)
    return new ExchangeError("INSUFFICIENT_BALANCE", "no balance", false, body);

  return new ExchangeError("UNKNOWN", body?.msg ?? `http ${status}`, status >= 500, body);
}
