import { describe, expect, test } from 'vitest';
import { loveType, PALETTE, phrases, recommend, similarity, QUESTIONS } from '../../src/lib/domain/loveType';
import { registrationError } from '../../src/lib/domain/register';

describe('love type', () => {
  const poleA = QUESTIONS.map((q) => (q.reversed ? 1 : 5)), poleB = poleA.map((v) => 6 - v);
  test('15 questions, reversed #7 #8 #9 #12 #13', () => {
    expect(QUESTIONS).toHaveLength(15);
    expect(QUESTIONS.flatMap((q, i) => (q.reversed ? [i + 1] : []))).toEqual([7, 8, 9, 12, 13]);
  });
  test('every question fits one line (≤ 12 chars without spaces)', () => {
    for (const q of QUESTIONS) expect(q.text.replace(/\s/g, '').length, q.text).toBeLessThanOrEqual(12);
  });
  test('pole A answers → 0, pole B → 15', () => {
    expect(loveType(poleA)).toBe(0);
    expect(loveType(poleB)).toBe(15);
  });
  test('questions without an axis never change the type', () => {
    for (const a of [0, 1, 2, 3]) expect(QUESTIONS.some((q) => q.axis === a)).toBe(true);
    expect(loveType(poleA.map((v, i) => (QUESTIONS[i].axis === null ? 6 - v : v)))).toBe(0);
  });
  test('exact 3 goes to pole A', () => expect(loveType(Array(15).fill(3))).toBe(0));
  test('palette has 16 distinct colors', () => expect(new Set(PALETTE).size).toBe(16));
  test('phrases follow bits', () => expect(phrases(0b0101)).toEqual(['자주 연락하며 곁에 있고 싶어요', '천천히, 은근하게 다가가요', '둘만의 아늑한 데이트가 좋아요', '지금 이 순간에 집중해요']));
  test('recommend: smallest distance, tie → lower number', () => {
    const me = { id: 'm', answers: Array(15).fill(4) };
    expect(recommend(me, [{ id: 'a', number: 2, answers: Array(15).fill(1) }, { id: 'b', number: 5, answers: Array(15).fill(4) }, { id: 'c', number: 1, answers: Array(15).fill(4) }])).toBe('c');
  });
  test('similarity: same 100, opposite ends 0', () => {
    const a = Array(15).fill(1), b = QUESTIONS.map((q) => (q.reversed ? 1 : 5));
    expect(similarity(a, a)).toBe(100);
    expect(similarity(QUESTIONS.map((q) => (q.reversed ? 5 : 1)), b)).toBe(0);
  });
  test('recommend with no others → null', () => expect(recommend({ id: 'm', answers: Array(15).fill(3) }, [])).toBeNull());
});

describe('registration validation', () => {
  const ok = { area: '성동구', mbti: 'infp', keywords: ['필라테스 3년차'], answers: Array(15).fill(3), shape: 'f1', consent: true };
  test('valid input passes', () => expect(registrationError(ok)).toBeNull());
  test('rejects bad fields', () => {
    expect(registrationError({ ...ok, mbti: 'ABCD' })).toMatch('MBTI');
    expect(registrationError({ ...ok, keywords: [] })).toMatch('키워드');
    expect(registrationError({ ...ok, keywords: ['a', 'b', 'c'] })).toMatch('키워드');
    expect(registrationError({ ...ok, answers: Array(14).fill(3) })).toMatch('질문');
    expect(registrationError({ ...ok, answers: [...Array(14).fill(3), 6] })).toMatch('질문');
    expect(registrationError({ ...ok, shape: 'star' })).toMatch('캐릭터');
    expect(registrationError({ ...ok, consent: false })).toMatch('동의');
    expect(registrationError({ ...ok, prop: 'glasses,blush' })).toBeNull();
    expect(registrationError({ ...ok, prop: 'glasses,sunglasses' })).toMatch('꾸미기');
    expect(registrationError({ ...ok, prop: 'crown' })).toMatch('꾸미기');
    expect(registrationError({ ...ok, prop: 'blush,blush' })).toMatch('꾸미기');
  });
  test('malformed JSON from the API never throws (wrong types → message, not 500)', () => {
    const bad = (patch: object) => registrationError({ ...ok, ...patch } as typeof ok);
    expect(bad({ area: 123 })).toMatch('다시');
    expect(bad({ keywords: [1] })).toMatch('다시');
    expect(bad({ keywords: 'x' })).toMatch('다시');
    expect(bad({ prop: 5 })).toMatch('다시');
    expect(bad({ mbti: null })).toMatch('다시');
    expect(registrationError(null as unknown as typeof ok)).toMatch('다시');
  });
});

test('16 type names are all different', async () => {
  const { typeName } = await import('../../src/lib/domain/loveType');
  expect(new Set(Array.from({ length: 16 }, (_, t) => typeName(t))).size).toBe(16);
});
