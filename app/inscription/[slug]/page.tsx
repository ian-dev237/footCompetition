import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { APP_NAME } from '@/lib/constants';
import InscriptionForm from './InscriptionForm';
import Realtime from '@/components/Realtime';
import RegisteredPlayers from './RegisteredPlayers';

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

      <RegisteredPlayers players={comp.players} />

      <Realtime slug={comp.slug} />
    </div>
  );
}
