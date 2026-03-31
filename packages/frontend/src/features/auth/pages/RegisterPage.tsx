import { useAuth } from '../hooks/use-auth.js';
import { RegisterForm } from '../components/RegisterForm.js';
import type { ApiError } from '@/lib/api-error.js';

export default function RegisterPage() {
  const { register } = useAuth();

  return (
    <RegisterForm
      onSubmit={register.mutate}
      isLoading={register.isPending}
      error={register.error as ApiError | null}
    />
  );
}
