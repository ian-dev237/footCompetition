import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { adminCookie, isAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (typeof currentPassword !== 'string' || currentPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
  }

  const envPath = path.join(process.cwd(), '.env');
  const envContent = await fs.readFile(envPath, 'utf8').catch(() => '');
  const escaped = newPassword.replace(/"/g, '\\"');
  const newLine = `ADMIN_PASSWORD="${escaped}"`;
  const updated = /^ADMIN_PASSWORD\s*=.*$/m.test(envContent)
    ? envContent.replace(/^ADMIN_PASSWORD\s*=.*$/m, newLine)
    : `${envContent}${envContent.endsWith('\n') ? '' : '\n'}${newLine}\n`;

  try {
    await fs.writeFile(envPath, updated, 'utf8');
  } catch (error) {
    return NextResponse.json({ error: 'Impossible de mettre à jour le fichier de configuration' }, { status: 500 });
  }

  process.env.ADMIN_PASSWORD = newPassword;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookie(), newPassword, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return res;
}
