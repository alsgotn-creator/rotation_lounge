/** 브라우저 → 우리 API. 행사장 와이파이가 끊겨도 throw 하지 않고 { ok: false } 로 돌아와서 버튼이 '보내는 중…'에 갇히지 않는다. */
export type ApiResult<T = Record<string, unknown>> = { ok: boolean; http: number; message?: string } & Partial<T>;

export async function api<T = Record<string, unknown>>(url: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<ApiResult<T>> {
  const r = await fetch(url, body === undefined ? { method, cache: 'no-store' } : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  const j = r ? await r.json().catch(() => null) : null;
  return { ok: false, message: r ? '다시 시도해주세요.' : '연결이 불안정해요. 다시 시도해주세요.', ...j, http: r?.status ?? 0 };
}
