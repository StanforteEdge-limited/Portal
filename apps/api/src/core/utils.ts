import { createHash, randomBytes } from 'crypto';
import { BadRequestException } from '$core/errors';

export type LeavePolicyScopeContext = {
  organization_id?: string;
  team_id?: string;
  staff_type?: string;
  user_id?: string;
};

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function toBigInt(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('Invalid numeric identifier');
    }
    return BigInt(value);
  }
  if (!value || value.trim().length === 0) {
    throw new Error('Identifier is required');
  }
  if (!/^\d+$/.test(value)) {
    throw new Error('Identifier must be a positive integer string');
  }
  return BigInt(value);
}

export function parseBigIntId(value: string | number | bigint, label: string): bigint {
  try {
    return toBigInt(value);
  } catch {
    throw new BadRequestException(`Invalid ${label}`);
  }
}

export function objectSchema(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function isLeaveRequestType(name: string | null, taxonomyKeys: string[] | null, formSchema: unknown) {
  const normalizedName = String(name ?? '').toLowerCase();
  const normalizedCategory = String(taxonomyKeys?.[0] ?? '').toLowerCase();
  const schemaLeaveTypeKey = String(objectSchema(formSchema).leave_type_key ?? '').trim().toLowerCase();
  return normalizedCategory.includes('leave') || normalizedName.includes('leave') || schemaLeaveTypeKey.length > 0;
}

export function resolveLeaveTypeKey(
  requestTypeName: string | null,
  formSchema: unknown,
  data: Record<string, unknown> = {},
) {
  const fromPayload = String(data.leave_type_key ?? data.leave_type ?? '').trim().toLowerCase();
  if (fromPayload) return fromPayload;
  const fromSchema = String(objectSchema(formSchema).leave_type_key ?? '').trim().toLowerCase();
  if (fromSchema) return fromSchema;
  const fromName = String(requestTypeName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return fromName || 'annual_leave';
}

export function policyScopeMatches(scopeType: string, scopeId: string | null, context: LeavePolicyScopeContext) {
  if (scopeType === 'global') return true;
  if (!scopeId) return false;
  if (scopeType === 'organization') return context.organization_id === scopeId;
  if (scopeType === 'team') return context.team_id === scopeId;
  if (scopeType === 'staff_type') return context.staff_type === scopeId;
  if (scopeType === 'user') return context.user_id === scopeId;
  return false;
}

export function policyScopeRank(scopeType: string) {
  if (scopeType === 'global') return 0;
  if (scopeType === 'organization') return 1;
  if (scopeType === 'team') return 2;
  if (scopeType === 'staff_type') return 3;
  if (scopeType === 'user') return 4;
  return 99;
}

export function makeUsernameSeed(firstName?: string | null, lastName?: string | null, fallback = 'user') {
  const base = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim();
  const raw = (base || fallback).toLowerCase();
  const normalized = raw.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return normalized || fallback;
}

export async function generateUniqueUsername(
  seed: string,
  exists: (username: string) => Promise<boolean>,
): Promise<string> {
  const cleanSeed = seed.replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '') || 'user';
  if (!(await exists(cleanSeed))) return cleanSeed;
  for (let i = 1; i <= 9999; i += 1) {
    const candidate = `${cleanSeed}.${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${cleanSeed}.${Date.now().toString().slice(-6)}`;
}