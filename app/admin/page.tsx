import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminNav from '@/components/AdminNav';
import NewCompetitionForm from './NewCompetitionForm';
import DeleteCompetitionButton from './competition/[slug]/DeleteCompetitionButton';
import { APP_NAME, COMPETITION_STATUS_LABEL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  requireAdmin('/admin');
  const competitions = await prisma.competition.findMany({
    orderBy: { createdAt: 'desc' },
    include: { players: true, journees: { include: { matches: true } } },
  });

  return (
    <div className="space-y-6">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Tableau de bord admin</h1>
        <p className="text-sm text-txt-secondary">
          Crée une compétition, partage le lien d’inscription, puis saisis les scores le jour J.
        </p>
      </div>

      <section className="rounded-xl border border-bdr bg-bg-secondary p-5">
        <h2 className="font-bold mb-3">Nouvelle compétition</h2>
        <NewCompetitionForm defaultName={APP_NAME} />
      </section>

      <section>
        <h2 className="font-bold mb-3">Compétitions existantes</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {competitions.map(c => {
            const totalMatches = c.journees.reduce((s, j) => s + j.matches.length, 0);
            const finished = c.journees.reduce((s, j) => s + j.matches.filter(m => m.status === 'FINISHED').length, 0);
            const lbl = COMPETITION_STATUS_LABEL[c.status] ?? COMPETITION_STATUS_LABEL.ONGOING;
            return (
              <Link key={c.id} href={`/admin/competition/${c.slug}`} className="group relative rounded-xl border border-bdr bg-bg-secondary p-4 hover:bg-bg-tertiary">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold truncate">{c.name}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${lbl.cls}`}>
                    {lbl.label}
                  </span>
                </div>
                <div className="text-xs text-txt-muted mt-1">
                  {c.status === 'REGISTRATION'
                    ? `${c.players.length} inscrit${c.players.length > 1 ? 's' : ''}`
                    : `${finished}/${totalMatches} matchs · ${c.players.length} joueurs`}
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DeleteCompetitionButton
                    slug={c.slug}
                    name={c.name}
                    playersCount={c.players.length}
                    compact
                  />
                </div>
              </Link>
            );
          })}
          {competitions.length === 0 && (
            <div className="rounded-xl border border-dashed border-bdr p-6 text-center text-txt-muted text-sm sm:col-span-2">
              Aucune compétition.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
