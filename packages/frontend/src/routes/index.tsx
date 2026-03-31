import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const AccountsPage = lazy(() => import('@/pages/accounts/AccountsPage'));
const CategoriesPage = lazy(() => import('@/pages/categories/CategoriesPage'));
const TransactionsPage = lazy(() => import('@/pages/transactions/TransactionsPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));

// ProtectedRoute: Redirect to /login if not authenticated
function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// PublicRoute: Redirect to /dashboard if already authenticated
function PublicRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <PageErrorBoundary>
                <LoginPage />
              </PageErrorBoundary>
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <PageErrorBoundary>
                <RegisterPage />
              </PageErrorBoundary>
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <PageErrorBoundary>
                <ResetPasswordPage />
              </PageErrorBoundary>
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageErrorBoundary>
                <DashboardPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <PageErrorBoundary>
                <AccountsPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <PageErrorBoundary>
                <CategoriesPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <PageErrorBoundary>
                <TransactionsPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions/new"
          element={
            <ProtectedRoute>
              <PageErrorBoundary>
                <TransactionsPage />
              </PageErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <PageErrorBoundary>
                <ProfilePage />
              </PageErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
