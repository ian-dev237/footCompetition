import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE = 'ps_admin';

export function isAdmin(): boolean {
  const value = cookies().get(COOKIE)?.value;
  return !!value && value === process.env.ADMIN_PASSWORD;
}

export function requireAdmin(nextPath = '/admin') {
  if (!isAdmin()) redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
}

export function adminCookie() {
  return COOKIE;
}
