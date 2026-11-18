import { describe, expect, it } from 'vitest';
import { CARDS, doubleTopic, DOUBLE_TOPICS, drawCard, KINDS, parseTopicId, topicId } from './cards';

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
  it('더블 라운지 주제: 만남마다 묶음이 달라 몇 번을 넘겨도 다른 만남의 주제와 안 겹친다', () => {
    for (const k of ['mild', 'spicy'] as const) {
      expect(DOUBLE_TOPICS[k].length).toBeGreaterThanOrEqual(40);
      for (const total of [2, 4, 5, 8, 12]) {
        const seen = new Map<string, number>();
        for (let r = 1; r <= total; r++) for (let step = -30; step <= 30; step++) {
          const x = doubleTopic(k, r, step, total);
          expect(seen.get(x) ?? r).toBe(r);
          seen.set(x, r);
        }
        expect(seen.size).toBe(Math.floor(DOUBLE_TOPICS[k].length / total) * total);
      }
      expect(doubleTopic(k, 1, 0, 4)).toBe(DOUBLE_TOPICS[k][0]);
    }
  });
  it('테이블 주제 상태는 저장 칸에서 그대로 돌아오고, 이상한 값은 순한맛 처음으로', () => {
    expect(parseTopicId(topicId({ kind: 'spicy', step: -3 }))).toEqual({ kind: 'spicy', step: -3 });
    for (const bad of [null, '', 'b1', 'toString:1', 'spicy:x']) expect(parseTopicId(bad)).toEqual({ kind: 'mild', step: 0 });
  });
  it('다시 뽑으면 같은 종류의 다른 카드', () => {
    for (const { kind } of KINDS) {
      const first = drawCard(kind);
      for (let i = 0; i < 30; i++) { const n = drawCard(kind, first.id); expect(n.kind).toBe(kind); expect(n.id).not.toBe(first.id); }
    }
  });
});
