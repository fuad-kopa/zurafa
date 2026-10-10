import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare } from '../src/share';
import { DEFAULT_RULES } from '../src/engine/position';

describe('shared game links', () => {
  it('round-trips rules, moves and result through a URL-safe string', () => {
    const g = { v: 1 as const, rules: DEFAULT_RULES, moves: ['e3e4', 'f8f7', 'k2l2'], ended: { winner: 0 as const, reason: 'mate' as never }, battle: 'ankara' };
    const s = encodeShare(g);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeShare(s)).toEqual(g);
  });

  it('rejects damaged or foreign data', () => {
    expect(decodeShare('not-base64!')).toBeNull();
    expect(decodeShare(encodeShare({ v: 2 } as never))).toBeNull();
    expect(decodeShare(encodeShare({ v: 1, rules: DEFAULT_RULES, moves: ['x'.repeat(40)] }))).toBeNull();
  });
});
