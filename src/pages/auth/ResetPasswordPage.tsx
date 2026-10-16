import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { AuthLayout } from './AuthLayout';

const schema = z
  .object({
    newPassword: z.string().min(8, 'Use at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  });

export function ResetPasswordPage() {
  const { updatePassword, mode } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Minimal controlled form (works with the recovery-link session).
  const [values, setValues] = useState({ newPassword: '', confirm: '' });
  const parsed = schema.safeParse(values);
  const fieldErrors = !parsed.success
    ? Object.fromEntries(
        parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
      )
    : {};

  if (mode === 'local') {
    return (
      <AuthLayout
        title="Set a new password"
        subtitle="Recovery links are delivered by email, which requires Supabase configuration."
        footer={
          <Link to="/forgot-password" className="font-medium text-primary-soft hover:text-highlight">
            Use local recovery instead
          </Link>
        }
      >
        <div className="rounded-xl border border-line bg-abyss/50 px-4 py-4">
          <p className="text-sm leading-relaxed text-muted">
            ARISE is running in local mode, so no email can be delivered. Local accounts can reset
            their password directly from the recovery page using the current password.
          </p>
        </div>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/forgot-password')}>
          Go to recovery
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you do not use anywhere else."
      footer={
        <Link to="/login" className="font-medium text-primary-soft hover:text-highlight">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-success/30 bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" aria-hidden />
          </span>
          <p className="text-sm text-muted">Password updated. You can sign in now.</p>
          <Button onClick={() => navigate('/login')}>Sign in</Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!parsed.success) return;
            setError(null);
            try {
              await updatePassword(values.newPassword);
              setDone(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not update password.');
            }
          }}
        >
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/35 bg-danger/10 px-3.5 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
              <p className="text-sm leading-relaxed text-danger">{error}</p>
            </div>
          )}

          <Field label="New password" htmlFor="newPassword" hint="8+ characters" error={fieldErrors.newPassword}>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={values.newPassword}
              onChange={(e) => setValues((v) => ({ ...v, newPassword: e.target.value }))}
            />
          </Field>

          <Field label="Confirm password" htmlFor="confirm" error={fieldErrors.confirm}>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={values.confirm}
              onChange={(e) => setValues((v) => ({ ...v, confirm: e.target.value }))}
            />
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={!parsed.success}>
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
