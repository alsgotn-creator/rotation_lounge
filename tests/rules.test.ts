import { describe, expect, test } from 'vitest';
import { seatsLeft, toSession, paymentDue, avoidHits } from '../src/lib/signup/rules';

const ev = { id: 'e1', slug: 's', title: 't', starts_at: '2026-11-14T10:30:00Z', venue: '성수', birth_from: 1994, birth_to: 1999, capacity_per_gender: 7, apply_open: true, price: 30000, payment_due_days: 3 };

describe('signup rules', () => {
  test('only awaiting_payment and confirmed hold seats', () => {
    const apps = [
      { gender: 'f', status: 'new' }, { gender: 'f', status: 'awaiting_payment' },
      { gender: 'f', status: 'confirmed' }, { gender: 'f', status: 'cancelled' }, { gender: 'm', status: 'confirmed' },
    ] as const;
    expect(seatsLeft(7, [...apps], 'f')).toBe(5);
    expect(seatsLeft(7, [...apps], 'm')).toBe(6);
  });
  test('session labels in KST', () => {
    const s = toSession(ev, [], new Date('2026-11-03T00:00:00Z'));
    expect([s.mon, s.day, s.dow, s.dateLabel, s.time]).toEqual(['NOV', '14', 'SAT', '11월 14일(토)', '오후 7:30']);
    expect(s.closed).toBe(false);
  });
  test('past or closed event is closed', () => {
    expect(toSession(ev, [], new Date('2026-11-15T00:00:00Z')).closed).toBe(true);
    expect(toSession({ ...ev, apply_open: false }, [], new Date('2026-11-03T00:00:00Z')).closed).toBe(true);
  });
  test('payment due is capped at the day before the event', () => {
    expect(paymentDue(new Date('2026-11-03T03:00:00Z'), ev.starts_at, 3)).toBe('2026-11-06');
    expect(paymentDue(new Date('2026-11-12T03:00:00Z'), ev.starts_at, 3)).toBe('2026-11-13');
  });
  test('avoid name matches other applicants ignoring spaces, skips cancelled and self', () => {
    const me = { id: 'a', avoid: [{ name: '이 서준' }] };
    const others = [
      { id: 'a', name: '이서준', status: 'new' }, { id: 'b', name: '이서준', status: 'new' },
      { id: 'c', name: '이서준', status: 'cancelled' }, { id: 'd', name: '박지훈', status: 'new' },
    ] as const;
    expect(avoidHits(me, [...others]).map((o) => o.id)).toEqual(['b']);
  });
});

import { pickNumber } from '../src/lib/signup/rules';
describe('random number', () => {
  test('picks only free numbers within capacity', () => {
    for (let i = 0; i < 50; i++) {
      const n = pickNumber([1, 3], 4);
      expect([2, 4]).toContain(n);
    }
  });
  test('deterministic with given rand; null when full', () => {
    expect(pickNumber([], 7, () => 0)).toBe(1);
    expect(pickNumber([], 7, () => 0.999)).toBe(7);
    expect(pickNumber([1, 2, 3], 3)).toBeNull();
  });
});
