import { describe, expect, test } from 'vitest';
import { isClosed } from '../../src/app/gwanghwamun/config';
import { avoidHits, birthFromKoreanAge, gwApplyRow, gwSource, isGwanghwamun, parseMbti, parsePrice, parseTails } from '../../src/lib/signup/rules';

describe('birthFromKoreanAge', () => {
  test('Korean age 25~35 in 2026 maps to 2002~1992', () => {
    expect(birthFromKoreanAge(25, 2026)).toBe(2002);
    expect(birthFromKoreanAge(35, 2026)).toBe(1992);
  });
});

describe('gwApplyRow', () => {
  const f = { job: '디자이너', ideal: '대화가 잘 통하는 사람', mbti: 'ENFP', message: '잘 부탁드려요', source: '인스타', traits: '차분함', exposure: '뒷모습·손만' };
  test('uses every column when 0019~0022 all exist', () => {
    expect(gwApplyRow(f, 0)).toEqual({ job: '디자이너', ideal: '대화가 잘 통하는 사람', source: '인스타', mbti: 'ENFP', host_message: '잘 부탁드려요', traits: '차분함', exposure: '뒷모습·손만' });
  });
  test('appends traits and exposure to the host message before 0022', () => {
    expect(gwApplyRow(f, 1)).toEqual({ job: '디자이너', ideal: '대화가 잘 통하는 사람', source: '인스타', mbti: 'ENFP', host_message: '잘 부탁드려요 · 성격: 차분함 · 촬영: 뒷모습·손만' });
  });
  test('appends mbti to job and the message to ideal before 0021', () => {
    expect(gwApplyRow({ ...f, traits: '', exposure: '' }, 2)).toEqual({ job: '디자이너 · MBTI: ENFP', ideal: '대화가 잘 통하는 사람 · 호스트에게: 잘 부탁드려요', source: '인스타' });
  });
  test('appends the source to job as well before 0020', () => {
    expect(gwApplyRow({ ...f, mbti: '', message: '', traits: '', exposure: '', source: 'QR' }, 3)).toEqual({ job: '디자이너 · 경로: QR', ideal: '대화가 잘 통하는 사람' });
  });
  test('packs everything into job before the 0019 migration', () => {
    expect(gwApplyRow({ ...f, traits: '', exposure: '', source: 'QR' }, 4)).toEqual({ job: '디자이너 · MBTI: ENFP · 이상형: 대화가 잘 통하는 사람 · 호스트에게: 잘 부탁드려요 · 경로: QR' });
  });
});

describe('isClosed (KST deadline)', () => {
  test('open until 12/10 10:00 KST, closed from then', () => {
    expect(isClosed(Date.parse('2026-12-10T09:59:00+09:00'))).toBe(false);
    expect(isClosed(Date.parse('2026-12-10T10:10:00+09:00'))).toBe(true);
  });
});

describe('parseMbti', () => {
  test('blank is fine, 4-letter types are upper-cased, anything else is rejected', () => {
    expect(parseMbti('')).toBe('');
    expect(parseMbti(' enfp ')).toBe('ENFP');
    expect(parseMbti('ABCD')).toBeNull();
    expect(parseMbti('ENF')).toBeNull();
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
