import { v4 as uuidv4 } from 'uuid';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

// Ensure the ID is a valid Postgres UUID
export function ensureUuid(id?: string | null): string {
  if (id && isUuid(id)) {
    return id;
  }
  return uuidv4();
}

export function newUuid(): string {
  return uuidv4();
}
