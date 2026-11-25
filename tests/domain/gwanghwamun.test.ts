import { describe, expect, test } from 'vitest';
import { isGwanghwamun } from '../../src/lib/signup/rules';

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
