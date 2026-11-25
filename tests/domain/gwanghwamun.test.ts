import { describe, expect, test } from 'vitest';
import { avoidHits, birthFromKoreanAge, gwApplyRow, gwSource, isGwanghwamun, parsePrice, parseTails } from '../../src/lib/signup/rules';

describe('birthFromKoreanAge', () => {
  test('Korean age 25~35 in 2026 maps to 2002~1992', () => {
    expect(birthFromKoreanAge(25, 2026)).toBe(2002);
    expect(birthFromKoreanAge(35, 2026)).toBe(1992);
  });
});

describe('gwApplyRow', () => {
  test('uses the ideal/near_work/source columns when they all exist', () => {
    expect(gwApplyRow('디자이너', '대화가 잘 통하는 사람', 'yes', '인스타', 0)).toEqual({ job: '디자이너', ideal: '대화가 잘 통하는 사람', near_work: '광화문 근처 근무', source: '인스타' });
  });
  test('appends the source to job when only the source column is missing', () => {
    expect(gwApplyRow('디자이너', '웃음이 많은 사람', 'no', 'QR', 1)).toEqual({ job: '디자이너 · 경로: QR', ideal: '웃음이 많은 사람', near_work: '광화문 근처 근무 아님' });
  });
  test('packs everything into job before the 0019 migration', () => {
    expect(gwApplyRow('디자이너', '웃음이 많은 사람', 'no', 'QR', 2)).toEqual({ job: '디자이너 · 이상형: 웃음이 많은 사람 · 광화문 근처 근무 아님 · 경로: QR' });
  });
});

describe('gwSource', () => {
  test('instagram link or in-app browser counts as 인스타, the rest as QR', () => {
    expect(gwSource('insta', 'Mozilla/5.0 Safari')).toBe('인스타');
    expect(gwSource(null, 'Mozilla/5.0 (iPhone) Instagram 312.0')).toBe('인스타');
    expect(gwSource(null, 'Mozilla/5.0 (iPhone) Safari')).toBe('QR');
  });
});

describe('parseTails', () => {
  test('empty is fine, digits are picked out, junk is rejected', () => {
    expect(parseTails('')).toEqual([]);
    expect(parseTails('1234, 5678 1234')).toEqual(['1234', '5678']);
    expect(parseTails('엄마')).toBeNull();
  });
});

describe('avoidHits by phone tail', () => {
  test("matches 뒷번호 entries against other applicants' phone endings", () => {
    const me = { id: 'a', avoid: [{ name: '뒷번호 5678' }] };
    const others = [
      { id: 'b', name: '김철수', status: 'confirmed' as const, phone: '010-1234-5678' },
      { id: 'c', name: '이영희', status: 'new' as const, phone: '' },
    ];
    expect(avoidHits(me, others).map((o) => o.id)).toEqual(['b']);
  });
});

describe('parsePrice', () => {
  test('blank falls back to the default fee', () => {
    expect(parsePrice('', 30000)).toBe(30000);
    expect(parsePrice(undefined, 32000)).toBe(32000);
  });
  test('accepts plain or formatted won amounts', () => {
    expect(parsePrice('40000', 30000)).toBe(40000);
    expect(parsePrice('40,000원', 30000)).toBe(40000);
    expect(parsePrice(0, 30000)).toBe(0);
  });
  test('rejects non-integers, negatives and absurd amounts', () => {
    expect(parsePrice('4만', 30000)).toBeNull();
    expect(parsePrice('-1', 30000)).toBeNull();
    expect(parsePrice('39999.5', 30000)).toBeNull();
    expect(parsePrice('2000000', 30000)).toBeNull();
  });
});

describe('isGwanghwamun', () => {
  test('picks lounges held around 광화문 or 을지로', () => {
    expect(isGwanghwamun({ venue: '광화문 카페 온기' })).toBe(true);
    expect(isGwanghwamun({ venue: '을지로3가' })).toBe(true);
  });
  test('includes double lounges (4 people per table) and skips other areas', () => {
    expect(isGwanghwamun({ venue: '광화문' })).toBe(true);
    expect(isGwanghwamun({ venue: '성수' })).toBe(false);
  });
});
