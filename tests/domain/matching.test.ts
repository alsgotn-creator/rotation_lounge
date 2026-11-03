import { describe, expect, test } from 'vitest';
import { mutualMatches, mutualPairs } from '../../src/lib/domain/matching';

const ch = (a: string, b: string) => ({ fromId: a, toId: b });

describe('matching', () => {
  const choices = [ch('a', 'b'), ch('b', 'a'), ch('c', 'a'), ch('a', 'd')];
  test('A and B picked each other → match', () => expect(mutualMatches(choices, 'a')).toEqual(['b']));
  test('C picked A one-way: C sees nothing, A never learns about C', () => {
    expect(mutualMatches(choices, 'c')).toEqual([]);
    expect(mutualMatches(choices, 'a')).not.toContain('c');
  });
  test('D was picked but did not pick back → nothing', () => expect(mutualMatches(choices, 'd')).toEqual([]));
  test('several matches are all returned', () => {
    expect(mutualMatches([ch('a', 'b'), ch('b', 'a'), ch('a', 'c'), ch('c', 'a')], 'a').sort()).toEqual(['b', 'c']);
  });
  test('no choices → no matches', () => expect(mutualMatches([], 'a')).toEqual([]));
  test('pairs listed once', () => expect(mutualPairs(choices)).toEqual([['a', 'b']]));
});
