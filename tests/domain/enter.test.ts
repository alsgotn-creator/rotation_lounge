import { describe, expect, it } from 'vitest';
import { after010 } from '../../src/lib/signup/validate';

describe('after010', () => {
  it('keeps the 8 digits after 010 however they are typed', () => {
    expect(after010('0000 0000')).toBe('00000000');
    expect(after010('010-0000-0000')).toBe('00000000');
    expect(after010('01012345678')).toBe('12345678');
    expect(after010('01001234')).toBe('01001234'); // 8자리면 그대로
  });
  it('typing 010 then the number key by key ends with the right 8 digits', () => {
    let v = '';
    for (const ch of '01012345678') v = after010(v + ch);
    expect(v).toBe('12345678');
    v = '';
    for (const ch of '01000000000') v = after010(v + ch);
    expect(v).toBe('00000000');
  });
});
