import { describe, expect, test } from 'vitest';
import { loungeCards, seatColumns, takenTables } from '../../src/lib/domain/lounge';

const rows = [
  { id: 'a', gender: 'f' as const, number: 1, shape: 'cloud', prop: 'none', love_type: 3, keywords: ['등산'], age: 29, job: '간호사', area: '성동구', mbti: 'INFP', answers: [1, 2, 3] },
  { id: 'b', gender: 'f' as const, number: null, shape: 'drop', prop: 'star', love_type: 7, keywords: ['영화'], age: 30, job: '교사', area: '마포구', mbti: 'ESTJ', answers: [3] },
  { id: 'c', gender: 'm' as const, number: 1, shape: 'mochi', prop: 'none', love_type: 0, keywords: ['캠핑'], age: 31, job: '개발자', area: '강남구', mbti: 'ENFP', answers: [5], excluded: true },
];

describe('lounge', () => {
  test('cards never carry private profile fields', () => {
    const json = JSON.stringify(loungeCards(rows, 'b'));
    for (const secret of ['간호사', '교사', '성동구', 'INFP', 'ESTJ', '"age"', '"answers"', '"job"', '"area"', '"mbti"']) expect(json).not.toContain(secret);
  });
  test('me first, excluded people hidden', () => {
    expect(loungeCards(rows, 'b').map((c) => [c.id, c.me])).toEqual([['b', true], ['a', false]]);
  });
  test('taken tables: same gender only, not me, not excluded', () => {
    expect(takenTables(rows, 'f', 'b')).toEqual([1]);
    expect(takenTables(rows, 'f', 'a')).toEqual([]);
    expect(takenTables(rows, 'm', 'x')).toEqual([]);
  });
  test('seat columns: right 1..4 top→bottom, left 7,6,5 (clockwise)', () => {
    expect(seatColumns(7)).toEqual({ right: [1, 2, 3, 4], left: [7, 6, 5] });
    expect(seatColumns(8)).toEqual({ right: [1, 2, 3, 4], left: [8, 7, 6, 5] });
  });
});
