import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import PlayerAvatar from '@/components/PlayerAvatar';
import { COMPETITION_STATUS_LABEL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const competitions = await prisma.competition.findMany({
    orderBy: { createdAt: 'desc' },
    include: { players: { include: { player: true } } },
  });
  const admin = isAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Compétitions</h1>
          <p className="text-txt-secondary text-sm mt-1">Tournois eFootball™ — phase de poule + élimination directe.</p>
        </div>
        {admin && (
          <Link href="/admin" className="rounded-lg bg-accent-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
            + Nouvelle compétition
          </Link>
        )}
      </div>

      {competitions.length === 0 && (
        <div className="rounded-xl border border-dashed border-bdr p-12 text-center text-txt-muted">
          Aucune compétition. {admin
            ? <Link href="/admin" className="text-accent-blue underline">Créez-en une</Link>
            : <Link href="/admin/login" className="text-accent-blue underline">Connectez-vous</Link>} pour démarrer.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitions.map(c => {
          const s = COMPETITION_STATUS_LABEL[c.status] ?? COMPETITION_STATUS_LABEL.ONGOING;
          const href = c.status === 'REGISTRATION' ? `/inscription/${c.slug}` : `/competition/${c.slug}`;
          return (
            <Link
              key={c.id}
              href={href}
              className="group rounded-xl border border-bdr bg-bg-secondary p-5 hover:bg-bg-tertiary transition"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="font-bold text-lg leading-tight">{c.name}</h2>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${s.cls}`}>
                  {s.label}
                </span>
              </div>
              <div className="text-xs text-txt-secondary mb-3">
                {c.players.length} joueur{c.players.length > 1 ? 's' : ''}
              </div>
              <div className="flex -space-x-2">
                {c.players.slice(0, 6).map(cp => (
                  <PlayerAvatar
                    key={cp.id}
                    name={cp.player.name}
                    initials={cp.player.initials}
                    color={cp.player.color}
                    imageUrl={cp.player.imageUrl}
                    size={28}
                  />
                ))}
                {c.players.length > 6 && (
                  <div className="h-7 w-7 rounded-full bg-bg-tertiary border border-bdr text-[10px] font-bold flex items-center justify-center text-txt-secondary">
                    +{c.players.length - 6}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
