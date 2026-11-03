import { describe, expect, test } from 'vitest';
import { formatPhone, isPhone, isEmail, birthError, isBirth } from '../src/lib/signup/validate';

describe('signup validation', () => {
  test('formats phone while typing', () => {
    expect(formatPhone('010')).toBe('010');
    expect(formatPhone('0101234')).toBe('010-1234');
    expect(formatPhone('010-1234-5678999')).toBe('010-1234-5678');
  });
  test('phone', () => {
    expect(isPhone('010-1234-5678')).toBe(true);
    expect(isPhone('010-123-456')).toBe(false);
  });
  test('email', () => {
    expect(isEmail('minji@gmail.com')).toBe(true);
    expect(isEmail('minji@gmail')).toBe(false);
  });
  test('birth year range', () => {
    expect(birthError('199', 1994, 1999)).toBeNull();
    expect(birthError('1990', 1994, 1999)).toMatch('94~99');
    expect(isBirth('1997', 1994, 1999)).toBe(true);
  });
});
