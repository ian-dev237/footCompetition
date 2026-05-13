import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { APP_NAME } from '@/lib/constants';
import InscriptionForm from './InscriptionForm';
import Realtime from '@/components/Realtime';
import PlayerAvatar from '@/components/PlayerAvatar';

export const dynamic = 'force-dynamic';

export default async function InscriptionPage({ params }: { params: { slug: string } }) {
  const comp = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: { players: { include: { player: true }, orderBy: { id: 'asc' } } },
  });
  if (!comp) notFound();

  const closed = comp.status !== 'REGISTRATION';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-txt-muted font-bold mb-1">{APP_NAME}</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold">{comp.name}</h1>
        <p className="text-txt-secondary text-sm mt-2">
          {closed
            ? 'Les inscriptions sont fermées.'
            : 'Inscris-toi pour participer. Entre ton nom et ajoute une photo si tu veux.'}
        </p>
      </div>

      {!closed && <InscriptionForm slug={comp.slug} />}

      {closed && (
        <Link
          href={`/competition/${comp.slug}`}
          className="block rounded-xl bg-accent-blue text-white text-center font-semibold py-3 hover:bg-blue-600"
        >
          Voir la compétition →
        </Link>
      )}

      <section>
        <div className="text-xs uppercase tracking-wider text-txt-muted font-semibold mb-2">
          Inscrits ({comp.players.length})
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {comp.players.map(cp => (
            <div key={cp.id} className="flex items-center gap-2 rounded-lg bg-bg-secondary border border-bdr p-2">
              <PlayerAvatar
                name={cp.player.name}
                initials={cp.player.initials}
                color={cp.player.color}
                imageUrl={cp.player.imageUrl}
                size={32}
              />
              <span className="text-sm truncate">{cp.player.name}</span>
            </div>
          ))}
          {comp.players.length === 0 && (
            <div className="col-span-full text-center text-txt-muted text-sm py-6 border border-dashed border-bdr rounded-xl">
              Sois le premier à t’inscrire.
            </div>
          )}
        </div>
      </section>

      <Realtime slug={comp.slug} />
    </div>
  );
}
