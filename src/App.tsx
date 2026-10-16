import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/app/AuthProvider';
import { DataProvider } from '@/app/DataProvider';
import { ThemeController } from '@/app/ThemeController';
import { AppRoutes } from '@/app/router';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <ToastProvider>
              <TooltipProvider delayDuration={250}>
                <ThemeController />
                <AppRoutes />
              </TooltipProvider>
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
