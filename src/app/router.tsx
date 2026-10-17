import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useData } from './DataProvider';
import { AppShell } from '@/components/layout/AppShell';
import { AriseWordmark } from '@/components/brand/Wordmark';
import { Spinner } from '@/components/ui/skeleton';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DashboardPage } from '@/pages/app/DashboardPage';
import { QuestsPage } from '@/pages/app/QuestsPage';
import { QuestDetailPage } from '@/pages/app/QuestDetailPage';
import { AttributesPage } from '@/pages/app/AttributesPage';
import { SkillsPage } from '@/pages/app/SkillsPage';
import { TrainingPage } from '@/pages/app/TrainingPage';
import { AcademyPage } from '@/pages/app/AcademyPage';
import { LessonPage } from '@/pages/app/LessonPage';
import { MindsetPage } from '@/pages/app/MindsetPage';
import { HistoryPage } from '@/pages/app/HistoryPage';
import { AnalyticsPage } from '@/pages/app/AnalyticsPage';
import { ProfilePage } from '@/pages/app/ProfilePage';
import { SettingsPage } from '@/pages/app/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

function FullScreenStatus({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-void px-4">
      <div className="flex flex-col items-center gap-5 text-center">
        <AriseWordmark markSize={40} textSize="text-2xl" />
        <div className="flex items-center gap-3 text-sm text-muted">
          <Spinner />
          {label}
        </div>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenStatus label="Establishing connection…" />;
  if (status === 'configurationError') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (status === 'signedOut') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (status === 'unverified') return <Navigate to="/signup" replace />;
  return <>{children}</>;
}

/** Inside /app: sends brand-new accounts to onboarding first. */
function RequireOnboarded({ children }: { children: ReactNode }) {
  const { bootstrap, status } = useData();
  if (status === 'loading') return <FullScreenStatus label="Loading your records…" />;
  if (status === 'error') return <FullScreenStatus label="Preparing your account…" />;
  if (bootstrap && !bootstrap.profile.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

/** /onboarding: skip once the profile is configured. */
function OnboardingGate({ children }: { children: ReactNode }) {
  const { bootstrap, status } = useData();
  if (status === 'loading') return <FullScreenStatus label="Loading your records…" />;
  if (bootstrap?.profile.onboardingCompleted) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingGate>
              <OnboardingPage />
            </OnboardingGate>
          </RequireAuth>
        }
      />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <RequireOnboarded>
              <AppShell />
            </RequireOnboarded>
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="quests" element={<QuestsPage />} />
        <Route path="quests/:id" element={<QuestDetailPage />} />
        <Route path="attributes" element={<AttributesPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="academy" element={<AcademyPage />} />
        <Route path="academy/:lessonId" element={<LessonPage />} />
        <Route path="mindset" element={<MindsetPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
