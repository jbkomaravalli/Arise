import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, CheckCircle2, MailCheck } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { AuthLayout } from './AuthLayout';

const signupSchema = z
  .object({
    displayName: z.string().min(2, 'Tell us what to call you (2+ characters).').max(60),
    email: z.string().email('Enter a valid email address.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  });

type SignupForm = z.infer<typeof signupSchema>;

export function SignupPage() {
  const { signUp, status, pendingVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signUp({ email: values.email, password: values.password, displayName: values.displayName });
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed.');
    }
  });

  if (status === 'unverified') {
    return (
      <AuthLayout
        title="Confirm your email"
        subtitle="One more step before the system accepts your registration."
        footer={
          <Link to="/login" className="font-medium text-primary-soft hover:text-highlight">
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-success/30 bg-success/10">
            <MailCheck className="h-7 w-7 text-success" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-muted">
            A verification link was sent to{' '}
            <span className="font-medium text-ink">{pendingVerificationEmail}</span>. Open it on
            this device, then sign in.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              I have verified — continue
            </Button>
            <Link to="/login" className="text-xs text-muted hover:text-ink">
              Use a different account
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Begin your awakening"
      subtitle="Create your hunter profile. Your records stay private to your account."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-primary-soft hover:text-highlight">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {serverError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/35 bg-danger/10 px-3.5 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
            <p className="text-sm leading-relaxed text-danger">{serverError}</p>
          </div>
        )}

        <Field label="Display name" htmlFor="displayName" error={errors.displayName?.message}>
          <Input id="displayName" autoComplete="name" placeholder="How the system addresses you" {...register('displayName')} />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          hint="8+ characters"
          error={errors.password?.message}
        >
          <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" {...register('password')} />
        </Field>

        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
          <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••" {...register('confirm')} />
        </Field>

        <div className="flex items-start gap-2.5 rounded-xl border border-line bg-abyss/50 px-3.5 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <p className="text-xs leading-relaxed text-muted">
            No admin privileges, no public profiles, no tracking. Your journal, workouts and
            progress belong to your account alone.
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
