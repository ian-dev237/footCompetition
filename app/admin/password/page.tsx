import { requireAdmin } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';
import ChangeAdminPasswordForm from './ChangeAdminPasswordForm';

export default async function ChangePasswordPage() {
  requireAdmin('/admin/password');

  return (
    <div className="space-y-6">
      <AdminNav />
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Modifier le mot de passe admin</h1>
        <p className="text-sm text-txt-secondary">
          Changez le mot de passe de l’administrateur. Vous resterez connecté après la modification.
        </p>
      </div>
      <section className="rounded-xl border border-bdr bg-bg-secondary p-5">
        <ChangeAdminPasswordForm />
      </section>
    </div>
  );
}
