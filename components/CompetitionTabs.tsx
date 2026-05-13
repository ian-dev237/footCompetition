'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export default function CompetitionTabs({ slug }: { slug: string }) {
  const path = usePathname();
  const tabs = [
    { href: `/competition/${slug}`,              label: 'Journées' },
    { href: `/competition/${slug}/classement`,   label: 'Classement' },
    { href: `/competition/${slug}/huitiemes`,    label: 'Huitièmes' },
    { href: `/competition/${slug}/demi-finales`, label: 'Demi-finales' },
    { href: `/competition/${slug}/finale`,       label: 'Finale' },
  ];
  return (
    <nav className="flex gap-1 border-b border-bdr overflow-x-auto">
      {tabs.map(t => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              'px-4 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition',
              active
                ? 'border-accent-blue text-txt-primary'
                : 'border-transparent text-txt-secondary hover:text-txt-primary',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
