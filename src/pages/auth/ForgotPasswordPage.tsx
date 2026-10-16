import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Info, MailCheck } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { Button } from '@/components/ui/button';
import { Field, Input, Label } from '@/components/ui/form';
import { AuthLayout } from './AuthLayout';

const schema = z.object({
  email: z.string().email('Enter a valid email address.'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { sendPasswordReset, changeLocalPassword, capabilities } = useAuth();
  const [sent, setSent] = useState<{ delivered: boolean; message: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [localState, setLocalState] = useState<{ done: boolean; error: string | null }>({
    done: false,
    error: null,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const result = await sendPasswordReset(values.email);
      setSent(result);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not start recovery.');
    }
  });

  return (
    <AuthLayout
      title="Recover access"
      subtitle="We will send a recovery link to your account email."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-primary-soft hover:text-highlight">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent?.delivered ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-success/30 bg-success/10">
            <MailCheck className="h-7 w-7 text-success" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-muted">{sent.message}</p>
          <p className="text-xs text-faint">The link opens on this device and expires quickly.</p>
        </div>
      ) : (
        <>
          {serverError && (
            <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-danger/35 bg-danger/10 px-3.5 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
              <p className="text-sm leading-relaxed text-danger">{serverError}</p>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Send recovery link
            </Button>
          </form>

          {sent && !sent.delivered && (
            <div className="mt-6 rounded-xl border border-line bg-abyss/50 p-4">
              <div className="mb-3 flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-highlight" aria-hidden />
                <p className="text-xs leading-relaxed text-muted">{sent.message}</p>
              </div>

              {capabilities.localPasswordReset && !localState.done && (
                <form
                  className="space-y-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const email = String(form.get('email') ?? '');
                    const current = String(form.get('current') ?? '');
                    const next = String(form.get('next') ?? '');
                    try {
                      await changeLocalPassword({
                        email,
                        currentPassword: current,
                        newPassword: next,
                      });
                      setLocalState({ done: true, error: null });
                    } catch (err) {
                      setLocalState({
                        done: false,
                        error: err instanceof Error ? err.message : 'Password change failed.',
                      });
                    }
                  }}
                >
                  <Label htmlFor="rp-email">Account email</Label>
                  <Input id="rp-email" name="email" type="email" required placeholder="you@example.com" />
                  <Label htmlFor="rp-current">Current password</Label>
                  <Input id="rp-current" name="current" type="password" required autoComplete="current-password" />
                  <Label htmlFor="rp-next">New password</Label>
                  <Input id="rp-next" name="next" type="password" required minLength={8} autoComplete="new-password" />
                  {localState.error && (
                    <p role="alert" className="text-xs text-danger">
                      {localState.error}
                    </p>
                  )}
                  <Button type="submit" variant="secondary" size="sm" className="w-full">
                    Reset with current password
                  </Button>
                </form>
              )}

              {localState.done && (
                <p className="text-sm font-medium text-success">
                  Password updated. Sign in with your new password.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </AuthLayout>
  );
}
