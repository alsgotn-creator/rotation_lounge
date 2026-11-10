import { describe, expect, it } from 'vitest';
import { randomGuest } from '../../src/lib/domain/demo';
import { registrationError } from '../../src/lib/domain/register';

describe('randomGuest', () => {
  it('always passes registration validation and matches gender', () => {
    for (let i = 0; i < 500; i++) for (const g of ['f', 'm'] as const) {
      const r = randomGuest(g);
      expect(registrationError(r)).toBeNull();
      expect(r.shape.startsWith(g)).toBe(true);
    }
  });
});
