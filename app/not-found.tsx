import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4">
      <div className="text-6xl font-black text-accent-blue">404</div>
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="text-sm text-txt-secondary">
        La page ou la compétition que tu cherches n'existe pas (ou plus).
      </p>
      <Link
        href="/"
        className="inline-block rounded-lg bg-accent-blue text-white px-4 py-2 text-sm font-semibold hover:bg-blue-600"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
