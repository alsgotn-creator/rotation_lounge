import { expect, test } from 'vitest';
import { cloud, IDEAL } from './ideal';

test('가장 많이 적힌 키워드가 맨 앞', () => {
  expect(cloud([['a', 'b'], ['b', 'b'], ['c']])).toEqual([{ word: 'b', count: 2 }, { word: 'a', count: 1 }, { word: 'c', count: 1 }]);
  expect(IDEAL.f.length + IDEAL.m.length).toBeGreaterThan(0);
});
