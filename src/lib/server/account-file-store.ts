import { promises as fs } from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';

const DEFAULT_MAX_JSON_CHARS = 1_500_000;

function getAccountDataRoot(): string {
  if (process.env.ACCOUNT_DATA_DIR) return process.env.ACCOUNT_DATA_DIR;
  if (process.platform === 'linux') return '/root/engkids-data/account-state';
  return path.join(process.cwd(), '.data', 'account-state');
}

function safeBucket(bucket: string): string {
  const normalized = bucket.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return normalized || 'default';
}

function accountFilePath(bucket: string, authUserId: string): string {
  const accountKey = createHash('sha256').update(authUserId).digest('hex');
  return path.join(getAccountDataRoot(), safeBucket(bucket), `${accountKey}.json`);
}

export async function readAccountJson<T>(bucket: string, authUserId: string): Promise<T | null> {
  try {
    const filePath = accountFilePath(bucket, authUserId);
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Failed to read account file store bucket "${bucket}":`, error);
    }
    return null;
  }
}

export async function writeAccountJson(
  bucket: string,
  authUserId: string,
  payload: unknown,
  maxJsonChars: number = DEFAULT_MAX_JSON_CHARS,
): Promise<void> {
  const serialized = JSON.stringify({
    updatedAt: new Date().toISOString(),
    payload,
  });

  if (serialized.length > maxJsonChars) {
    throw new Error(`Account payload too large for bucket "${bucket}"`);
  }

  const filePath = accountFilePath(bucket, authUserId);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tempPath = path.join(dir, `${path.basename(filePath)}.${randomUUID()}.tmp`);
  await fs.writeFile(tempPath, serialized, 'utf8');
  await fs.rename(tempPath, filePath);
}
