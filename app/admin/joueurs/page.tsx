import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';
import PlayersManager from './PlayersManager';

export const dynamic = 'force-dynamic';

export default async function JoueursPage() {
  requireAdmin('/admin/joueurs');
  const players = await prisma.player.findMany({
    orderBy: { createdAt: 'asc' },
    include: { competitions: { include: { competition: true } } },
  });

  return (
    <div className="space-y-4">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Joueurs (annuaire global)</h1>
        <p className="text-sm text-txt-secondary mt-1">
          Tous les joueurs jamais créés, toutes compétitions confondues.
        </p>
      </div>

      <div className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 p-4 text-sm text-txt-secondary space-y-1">
        <div className="font-semibold text-accent-cyan">ℹ️ Cette page n'inscrit personne à un tournoi.</div>
        <p>
          Pour qu'un joueur participe à une compétition, il doit s'inscrire via le
          <span className="text-txt-primary font-semibold"> lien d'inscription</span> de cette
          compétition, ou être ajouté manuellement depuis sa page admin
          (<Link href="/admin" className="text-accent-blue underline">tableau de bord</Link>).
        </p>
        <p>
          Les joueurs créés ici sans rattachement à une compétition restent simplement dans l'annuaire — utile pour préparer des photos à l'avance, mais ils n'apparaîtront dans aucun tournoi.
        </p>
      </div>

      <PlayersManager initialPlayers={players as any} />
    </div>
  );
}
