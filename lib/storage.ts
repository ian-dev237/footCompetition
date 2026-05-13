import { put, del } from '@vercel/blob';

export async function savePlayerImage(playerId: string, buffer: Buffer, ext: string): Promise<string> {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  const filename = `player-${playerId}-${Date.now()}.${safeExt}`;
  const blob = await put(`uploads/${filename}`, buffer, {
    access: 'public',
    contentType: `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`,
  });
  return blob.url;
}

export async function deletePlayerImage(url: string) {
  if (!url) return;
  try { await del(url); } catch { /* ignore */ }
}
