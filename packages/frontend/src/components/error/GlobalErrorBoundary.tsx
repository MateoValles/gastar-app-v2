import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface GlobalErrorFallbackProps {
  error: Error;
  onReset: () => void;
}

function GlobalErrorFallback({ error, onReset }: GlobalErrorFallbackProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-destructive">{t('errors.globalError')}</h1>
        <p className="text-muted-foreground">{t('errors.globalErrorDescription')}</p>
        {import.meta.env.DEV && (
          <pre className="mt-2 max-w-lg overflow-auto rounded bg-muted p-4 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
      </div>
      <Button onClick={onReset}>{t('errors.reload')}</Button>
    </div>
  );
}

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GlobalErrorBoundary] Uncaught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return <GlobalErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
