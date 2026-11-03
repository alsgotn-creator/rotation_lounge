import { describe, expect, it } from 'vitest';
import { CARDS, drawCard, KINDS } from './cards';

describe('cards', () => {
  it('원문을 모두 옮겼고 되묻기 안내는 없다', () => {
    expect(CARDS.length).toBeGreaterThan(20);
    expect(CARDS.some((c) => /되물어/.test(c.prompt + (c.hint ?? '')))).toBe(false);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
  });
  it('밸런스는 선택지 2개, 나머지는 자유 답변', () => {
    CARDS.filter((c) => c.kind === 'balance').forEach((c) => expect(c.options).toHaveLength(2));
    CARDS.filter((c) => c.kind !== 'balance').forEach((c) => expect(c.options).toBeNull());
  });
  it('다시 뽑으면 같은 종류의 다른 카드', () => {
    for (const { kind } of KINDS) {
      const first = drawCard(kind);
      for (let i = 0; i < 30; i++) { const n = drawCard(kind, first.id); expect(n.kind).toBe(kind); expect(n.id).not.toBe(first.id); }
    }
  });
});
