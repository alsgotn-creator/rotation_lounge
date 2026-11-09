import { expect, test } from 'vitest';
import { cloud, IDEAL } from './ideal';

test('가장 많이 적힌 키워드가 맨 앞', () => {
  expect(cloud([['a', 'b'], ['b', 'b'], ['c']])).toEqual([{ word: 'b', count: 2 }, { word: 'a', count: 1 }, { word: 'c', count: 1 }]);
  expect(cloud(IDEAL.m)[0]).toEqual({ word: '귀여운', count: 3 });
  expect(cloud(IDEAL.f)[0]).toEqual({ word: '강아지상', count: 2 });
});
