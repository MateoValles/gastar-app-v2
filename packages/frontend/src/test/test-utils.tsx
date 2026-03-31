import type { ReactNode } from 'react';
import { render, type RenderResult, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import '../lib/i18n';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllProvidersProps {
  children: ReactNode;
  initialEntries?: string[];
}

function AllProviders({ children, initialEntries = ['/'] }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & { initialEntries?: string[] };

function customRender(ui: React.ReactElement, options?: CustomRenderOptions): RenderResult {
  const { initialEntries, ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialEntries={initialEntries}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
}

export * from '@testing-library/react';
export { customRender as render };
