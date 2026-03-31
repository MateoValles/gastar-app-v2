import { useAuth } from '../hooks/use-auth.js';
import { LoginForm } from '../components/LoginForm.js';
import type { ApiError } from '@/lib/api-error.js';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <LoginForm
      onSubmit={login.mutate}
      isLoading={login.isPending}
      error={login.error as ApiError | null}
    />
  );
}
