'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';

export default function AdminNav() {
  const path = usePathname();
  const router = useRouter();
  const tabs = [
    { href: '/admin', label: 'Tableau de bord' },
    { href: '/admin/joueurs', label: 'Joueurs' },
    { href: '/admin/password', label: 'Mot de passe' },
  ];
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-bdr">
      {tabs.map(t => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              'px-4 py-2 text-sm font-semibold border-b-2 -mb-px',
              active ? 'border-accent-blue text-txt-primary' : 'border-transparent text-txt-secondary hover:text-txt-primary',
            )}
          >
            {t.label}
          </Link>
        );
      })}
      <button
        onClick={async () => {
          await fetch('/api/auth', { method: 'DELETE' });
          router.push('/');
          router.refresh();
        }}
        className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg text-txt-secondary hover:text-status-loss"
      >
        Se déconnecter
      </button>
    </nav>
  );
}
