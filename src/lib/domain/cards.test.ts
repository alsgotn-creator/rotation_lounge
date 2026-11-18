import { describe, expect, it } from 'vitest';
import { CARDS, doubleTopic, DOUBLE_TOPICS, drawCard, KINDS } from './cards';

describe('cards', () => {
  it('원문을 모두 옮겼고 되묻기 안내는 없다', () => {
    expect(CARDS.length).toBeGreaterThan(20);
    expect(CARDS.some((c) => /되물어/.test(c.prompt + c.options.join('')))).toBe(false);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
  });
  it('모든 카드는 고르기만 한다: 밸런스는 2개, 나머지는 3~7개', () => {
    CARDS.filter((c) => c.kind === 'balance').forEach((c) => expect(c.options).toHaveLength(2));
    CARDS.filter((c) => c.kind === 'talk' || c.kind === 'scenario').forEach((c) => { expect(c.options.length).toBeGreaterThanOrEqual(3); expect(c.options.length).toBeLessThanOrEqual(7); });
  });
  it('더블 라운지 주제: 만남마다 하나, 한 모임(최대 12번)에서 겹치지 않는다', () => {
    expect(new Set(Array.from({ length: 12 }, (_, i) => doubleTopic(i + 1))).size).toBe(12);
    expect(doubleTopic(1)).toBe(DOUBLE_TOPICS[0]);
  });
  it('다시 뽑으면 같은 종류의 다른 카드', () => {
    for (const { kind } of KINDS) {
      const first = drawCard(kind);
      for (let i = 0; i < 30; i++) { const n = drawCard(kind, first.id); expect(n.kind).toBe(kind); expect(n.id).not.toBe(first.id); }
    }
  });
});
