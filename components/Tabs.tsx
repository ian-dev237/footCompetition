import Link from 'next/link';
import clsx from 'clsx';

type Tab = { href: string; label: string };

export default function Tabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  return (
    <nav className="flex gap-1 border-b border-bdr mb-4 overflow-x-auto">
      {tabs.map(t => {
        const isActive = active === t.href || active.startsWith(t.href + '/');
        return (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              'px-4 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition',
              isActive
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
