import { v4 as uuidv4 } from 'uuid';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Deterministic map for known seed IDs to prevent regenerating random UUIDs on sync
const LEGACY_ID_MAP: Record<string, string> = {
  'type-1': '00000000-0000-4000-8000-000000000001',
  'type-2': '00000000-0000-4000-8000-000000000002',
  'type-3': '00000000-0000-4000-8000-000000000003',
  'type-4': '00000000-0000-4000-8000-000000000004',
  'type-5': '00000000-0000-4000-8000-000000000005',
  'type-6': '00000000-0000-4000-8000-000000000006',
};

export function isUuid(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

// Ensure the ID is a valid Postgres UUID (deterministic for known legacy IDs)
export function ensureUuid(id?: string | null): string {
  if (!id) return uuidv4();
  if (isUuid(id)) {
    return id;
  }
  if (LEGACY_ID_MAP[id]) {
    return LEGACY_ID_MAP[id];
  }
  return uuidv4();
}

export function newUuid(): string {
  return uuidv4();
}

