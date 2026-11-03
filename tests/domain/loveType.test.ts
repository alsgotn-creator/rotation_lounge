import { describe, expect, test } from 'vitest';
import { loveType, PALETTE, phrases, recommend, QUESTIONS } from '../../src/lib/domain/loveType';
import { registrationError } from '../../src/lib/domain/register';

describe('love type', () => {
  test('15 questions, reversed #3 #7 #10 #14', () => {
    expect(QUESTIONS).toHaveLength(15);
    expect(QUESTIONS.flatMap((q, i) => (q.reversed ? [i + 1] : []))).toEqual([3, 7, 10, 14]);
  });
  test('all 5s → 0 (reversed items flipped)', () => expect(loveType(Array(15).fill(5))).toBe(0));
  test('all 1s → 15', () => expect(loveType(Array(15).fill(1))).toBe(15));
  test('exact 3 goes to pole A', () => expect(loveType(Array(15).fill(3))).toBe(0));
  test('palette has 16 distinct colors', () => expect(new Set(PALETTE).size).toBe(16));
  test('phrases follow bits', () => expect(phrases(0b0101)).toEqual(['자주 연락하며 곁에 있고 싶어요', '천천히, 은근하게 다가가요', '둘만의 아늑한 데이트가 좋아요', '지금 이 순간에 집중해요']));
  test('recommend: smallest distance, tie → lower number', () => {
    const me = { id: 'm', answers: Array(15).fill(4) };
    expect(recommend(me, [{ id: 'a', number: 2, answers: Array(15).fill(1) }, { id: 'b', number: 5, answers: Array(15).fill(4) }, { id: 'c', number: 1, answers: Array(15).fill(4) }])).toBe('c');
  });
  test('recommend with no others → null', () => expect(recommend({ id: 'm', answers: Array(15).fill(3) }, [])).toBeNull());
});

describe('registration validation', () => {
  const ok = { nickname: '민지', area: '성동구', mbti: 'infp', keywords: ['필라테스 3년차'], answers: Array(15).fill(3), shape: 'cloud', prop: 'none', consent: true };
  test('valid input passes', () => expect(registrationError(ok)).toBeNull());
  test('rejects bad fields', () => {
    expect(registrationError({ ...ok, nickname: '' })).toMatch('닉네임');
    expect(registrationError({ ...ok, nickname: '열세글자닉네임입니다아아아' })).toMatch('닉네임');
    expect(registrationError({ ...ok, mbti: 'ABCD' })).toMatch('MBTI');
    expect(registrationError({ ...ok, keywords: [] })).toMatch('키워드');
    expect(registrationError({ ...ok, keywords: ['a', 'b', 'c'] })).toMatch('키워드');
    expect(registrationError({ ...ok, answers: Array(14).fill(3) })).toMatch('질문');
    expect(registrationError({ ...ok, answers: [...Array(14).fill(3), 6] })).toMatch('질문');
    expect(registrationError({ ...ok, shape: 'star' })).toMatch('캐릭터');
    expect(registrationError({ ...ok, consent: false })).toMatch('동의');
  });
});
