import { BadRequestException } from '@nestjs/common';

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
