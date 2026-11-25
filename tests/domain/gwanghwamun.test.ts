import { describe, expect, test } from 'vitest';
import { isGwanghwamun, parsePrice } from '../../src/lib/signup/rules';

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
    expect(isGwanghwamun({ venue: '광화문 카페 온기', title: '플러팅 라운지' })).toBe(true);
    expect(isGwanghwamun({ venue: '을지로3가', title: '플러팅 라운지' })).toBe(true);
  });
  test('skips other areas and double lounges', () => {
    expect(isGwanghwamun({ venue: '성수', title: '플러팅 라운지' })).toBe(false);
    expect(isGwanghwamun({ venue: '광화문', title: '플러팅 더블 라운지' })).toBe(false);
  });
});
