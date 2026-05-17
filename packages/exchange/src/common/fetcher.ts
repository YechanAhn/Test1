export interface FetchRequest {
  method: "GET" | "POST" | "DELETE" | "PUT";
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface FetchResponse {
  status: number;
  body: unknown;
}

/** 어댑터에 주입하는 fetch 추상화. 실제 구현은 fetch() 래퍼, 테스트는 mock. */
export type Fetcher = (req: FetchRequest) => Promise<FetchResponse>;

export const realFetcher: Fetcher = async (req) => {
  const res = await fetch(req.url, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // not json — leave as text
  }
  return { status: res.status, body: parsed };
};
