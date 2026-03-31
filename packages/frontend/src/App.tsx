import { useEffect } from 'react';
import { BrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/query-client';
import '@/lib/i18n';
import { useUIStore } from '@/stores/ui.store';
import { AppRoutes } from '@/routes';
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary';

function ThemeInitializer() {
  const { theme, setTheme } = useUIStore();

  useEffect(() => {
    // Re-apply theme on mount to register system listener if needed
    setTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeInitializer />
          <AppRoutes />
          <Toaster position="bottom-right" richColors />
        </BrowserRouter>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
