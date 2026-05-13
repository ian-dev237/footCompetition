import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Realtime from '@/components/Realtime';
import CompetitionTabs from '@/components/CompetitionTabs';
import { isAdmin } from '@/lib/auth';

export default async function CompetitionLayout({
  children, params,
}: { children: React.ReactNode; params: { slug: string } }) {
  const comp = await prisma.competition.findUnique({ where: { slug: params.slug } });
  if (!comp) notFound();
  const admin = isAdmin();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-xs text-txt-secondary hover:text-txt-primary">← Toutes les compétitions</Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">{comp.name}</h1>
        </div>
        {admin && (
          <Link href={`/admin/competition/${comp.slug}`} className="rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600">
            Saisir les scores
          </Link>
        )}
      </div>

      <CompetitionTabs slug={comp.slug} />
      {children}
      <Realtime slug={comp.slug} />
    </div>
  );
}
