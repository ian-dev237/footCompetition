'use client';
import clsx from 'clsx';
import Link from 'next/link';

type Journee = {
  number: number;
  progress: 'done' | 'live' | 'pending';
};

export default function JourneeNav({
  slug, journees, current,
}: { slug: string; journees: Journee[]; current: number }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {journees.map(j => {
        const active = j.number === current;
        return (
          <Link
            key={j.number}
            href={`/competition/${slug}?j=${j.number}`}
            scroll={false}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-semibold border transition flex items-center gap-2',
              active
                ? 'bg-accent-blue text-white border-accent-blue'
                : 'bg-bg-secondary text-txt-secondary border-bdr hover:bg-bg-tertiary',
            )}
          >
            <span>J{j.number}</span>
            <span className={clsx(
              'inline-block h-1.5 w-1.5 rounded-full',
              j.progress === 'done' && 'bg-status-win',
              j.progress === 'live' && 'bg-accent-gold animate-livepulse',
              j.progress === 'pending' && 'bg-txt-muted',
            )} />
          </Link>
        );
      })}
    </div>
  );
}
