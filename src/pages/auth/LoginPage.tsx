import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { AuthLayout } from './AuthLayout';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { signIn, mode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signIn(values);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign-in failed.');
    }
  });

  return (
    <AuthLayout
      title="Re-enter the system"
      subtitle="Sign in to continue your progression."
      footer={
        <>
          No account yet?{' '}
          <Link to="/signup" className="font-medium text-primary-soft hover:text-highlight">
            Begin your awakening
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

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
          />
        </Field>

        <div className="flex items-center justify-between">
          <Link to="/forgot-password" className="text-xs font-medium text-muted hover:text-ink">
            Forgot password?
          </Link>
          {mode === 'local' && (
            <Link to="/signup" className="text-xs font-medium text-muted hover:text-ink">
              Create local account
            </Link>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
