import type { UserRef } from '@stanforte/contract';
import { toBigInt } from '$core/utils';
import { BadRequestException } from '$core/errors';
import { profile } from '$apps/identity/users/model';

export type ProfileRefRow = {
  id: bigint | null;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

export function parseWorkBigInt(value: string, label: string) {
  try {
    return toBigInt(value);
  } catch {
    throw new BadRequestException(`Invalid ${label}`);
  }
}

export function optionalString(value?: string | null) {
  if (value == null) return null;
  const next = String(value).trim();
  return next.length ? next : null;
}

export function optionalBigInt(value: string | null | undefined, label: string) {
  const next = optionalString(value);
  return next ? parseWorkBigInt(next, label) : null;
}

export function normalizeTags(tags?: string[] | null) {
  if (!tags) return [];
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

export function serializeProfile(row: any) {
  return {
    id: row.id.toString(),
    full_name: [row.firstName, row.lastName].filter(Boolean).join(' ') || row.email,
    email: row.email,
  };
}

export function serializeProfileRef(row: ProfileRefRow | null): UserRef | null {
  return row?.id
    ? {
        id: row.id.toString(),
        email: row.email ?? '',
        username: row.username,
        first_name: row.firstName,
        last_name: row.lastName,
      }
    : null;
}

export function profileRefColumns() {
  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    firstName: profile.firstName,
    lastName: profile.lastName,
  };
}

export function serializeFileAsset(file: {
  id: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: bigint | null;
  publicUrl: string | null;
  storagePath: string | null;
} | null) {
  return file?.id
    ? {
        id: file.id,
        file_name: file.fileName,
        mime_type: file.mimeType,
        file_size: file.fileSize ? file.fileSize.toString() : null,
        public_url: file.publicUrl,
        storage_path: file.storagePath,
      }
    : null;
}
