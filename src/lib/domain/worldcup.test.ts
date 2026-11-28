import { describe, expect, test } from 'vitest';
import { roundName, shuffle, WC, wcResultError } from './worldcup';

describe('worldcup', () => {
  test('16 candidates per gender, ids unique', () => {
    expect(WC.f).toHaveLength(16);
    expect(WC.m).toHaveLength(16);
    expect(new Set([...WC.f, ...WC.m].map((c) => c.id)).size).toBe(32);
  });
  test('round names go 16강 → 8강 → 4강 → 결승', () => {
    expect([16, 8, 4, 2].map(roundName)).toEqual(['16강', '8강', '4강', '결승']);
  });
  test('shuffle keeps every card', () => {
    expect(shuffle(WC.f, () => 0.3).map((c) => c.id).sort()).toEqual(WC.f.map((c) => c.id).sort());
  });
  test('result must rank every candidate once and end with the winner', () => {
    const order = WC.m.map((c) => c.id);
    expect(wcResultError({ winner: 'm16', order }, WC.m)).toBeNull();
    expect(wcResultError({ winner: 'm01', order }, WC.m)).not.toBeNull();
    expect(wcResultError({ winner: 'f16', order: WC.f.map((c) => c.id) }, WC.m)).not.toBeNull();
    expect(wcResultError({ winner: 'm16', order: order.slice(1) }, WC.m)).not.toBeNull();
  });
});
