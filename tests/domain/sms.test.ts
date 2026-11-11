import { describe, expect, test } from 'vitest';
import { matchSms, noMatchSms } from '../../src/lib/domain/sms';

describe('sms', () => {
  test('one match lists the partner with phone', () => {
    const t = matchSms('민지', [{ label: '남3호', name: '준호', phone: '010-1111-2222' }]);
    expect(t).toContain('민지님');
    expect(t).toContain('서로 마음이 닿은 분이 있어요');
    expect(t).toContain('남3호 준호님 · 010-1111-2222');
  });
  test('two matches say the count', () => {
    const t = matchSms('민지', [{ label: '남3호', name: 'a', phone: '1' }, { label: '남5호', name: 'b', phone: '2' }]);
    expect(t).toContain('2분 있어요');
    expect(t).toContain('남5호 b님 · 2');
  });
  test('brave card adds the cafe notice only when given', () => {
    const p = { label: '남3호', name: '준호', phone: '1' };
    expect(matchSms('민지', [p], p)).toContain('🔥 남3호 준호님과는 서로 용기 카드');
    expect(matchSms('민지', [p], p)).toContain('The November 라운지 이대점');
    expect(matchSms('민지', [p])).not.toContain('🔥');
  });
  test('no match', () => expect(noMatchSms('민지')).toContain('민지님'));
});
