export function makeUsernameSeed(firstName?: string | null, lastName?: string | null, fallback = 'user') {
  const base = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim();
  const raw = (base || fallback).toLowerCase();
  const normalized = raw.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return normalized || fallback;
}

export async function generateUniqueUsername(
  seed: string,
  exists: (username: string) => Promise<boolean>
): Promise<string> {
  const cleanSeed = seed.replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '') || 'user';
  if (!(await exists(cleanSeed))) return cleanSeed;
  for (let i = 1; i <= 9999; i += 1) {
    const candidate = `${cleanSeed}.${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${cleanSeed}.${Date.now().toString().slice(-6)}`;
}
