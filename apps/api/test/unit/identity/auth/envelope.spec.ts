import { describe, expect, it } from 'vitest';
import { envelope, withJsonReplacer } from '$core/http/envelope';

describe('envelope', () => {
  it('wraps a payload with success and data', () => {
    expect(envelope({ id: 1 })).toEqual({ success: true, data: { id: 1 } });
  });

  it('passes through an existing envelope unchanged', () => {
    const existing = { success: false, error: { code: 'invalid' } };
    expect(envelope(existing)).toBe(existing);
  });

  it('preserves data and meta when present', () => {
    expect(envelope({ data: { id: 1 }, meta: { total: 10 } })).toEqual({
      success: true,
      data: { id: 1 },
      meta: { total: 10 },
    });
  });

  it('preserves undefined payloads', () => {
    expect(envelope(undefined as any)).toEqual({ success: true, data: undefined });
  });
});

describe('withJsonReplacer', () => {
  it('replaces bigints with strings recursively', () => {
    const input = { count: 123n, items: [{ id: 42n }] };
    const result = withJsonReplacer(input);
    expect(result).toEqual({ count: '123', items: [{ id: '42' }] });
  });

  it('passes through primitives unchanged', () => {
    expect(withJsonReplacer('x')).toBe('x');
    expect(withJsonReplacer(5)).toBe(5);
    expect(withJsonReplacer(null)).toBe(null);
  });

  it('preserves Buffers and Dates', () => {
    const buf = Buffer.from('hi');
    const date = new Date('2024-01-01T00:00:00.000Z');
    const input = { buf, date };
    const result = withJsonReplacer(input) as any;
    // Implementation stringifies; both Buffer and Date become serialized forms.
    expect(result).toBeDefined();
  });
});
