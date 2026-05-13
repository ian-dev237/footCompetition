import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function savePlayerImage(playerId: string, buffer: Buffer, ext: string): Promise<string> {
  await ensureUploadDir();
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  // include a cache-buster so the browser refetches after a replace
  const filename = `player-${playerId}-${Date.now()}.${safeExt}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filepath, buffer);
  return `/uploads/${filename}`;
}

export async function deletePlayerImage(publicUrl: string) {
  if (!publicUrl?.startsWith('/uploads/')) return;
  const filepath = path.join(process.cwd(), 'public', publicUrl);
  try { await fs.unlink(filepath); } catch { /* ignore */ }
}
