/**
 * Mirrors the Nest `ResponseEnvelopeInterceptor`: every successful handler result
 * is wrapped as `{ success: true, data }` unless the handler already produced an
 * envelope of its own.
 */
export function envelope(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && typeof (value as any).success === 'boolean') {
    return value as Record<string, unknown>;
  }

  if (
    value &&
    typeof value === 'object' &&
    Object.prototype.hasOwnProperty.call(value, 'data') &&
    Object.prototype.hasOwnProperty.call(value, 'meta')
  ) {
    return { success: true, data: (value as any).data, meta: (value as any).meta };
  }

  return { success: true, data: value };
}

/**
 * Express handled BigInt globally with a JSON replacer. Fastify has no such
 * option, so payloads are normalized on the way out instead.
 */
export function withJsonReplacer(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return value;
  if (value instanceof Date) return value;
  return JSON.parse(JSON.stringify(value, (_key, current) => (typeof current === 'bigint' ? current.toString() : current)));
}
