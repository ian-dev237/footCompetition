import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${APP_NAME} — Compétition`,
  description: 'Tournoi eFootball™ / FIFA — phase de poule + élimination directe',
  icons: {
    icon: '/logopkf.png',
    shortcut: '/logopkf.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = isAdmin();
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-bg-primary text-txt-primary">
        <header className="sticky top-0 z-40 backdrop-blur bg-bg-primary/80 border-b border-bdr">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-extrabold text-lg tracking-tight flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-accent-blue" />
              <span>{APP_NAME}</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-semibold">
              <Link href="/" className="px-3 py-1.5 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-bg-secondary">Compétitions</Link>
              {admin
                ? <Link href="/admin" className="px-3 py-1.5 rounded-lg bg-accent-blue text-white hover:bg-blue-600">Admin</Link>
                : <Link href="/admin/login" className="px-3 py-1.5 rounded-lg text-txt-secondary hover:text-txt-primary hover:bg-bg-secondary">Connexion</Link>
              }
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
