import { redirect } from 'next/navigation';

export default function PlayoffsLegacyRedirect({ params }: { params: { slug: string } }) {
  redirect(`/competition/${params.slug}/huitiemes`);
}
