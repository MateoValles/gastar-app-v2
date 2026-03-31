import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PageErrorBoundary } from '@/components/error/PageErrorBoundary';
import { AppLayout } from '@/components/layout/AppLayout';

// Lazy-loaded pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const AccountsPage = lazy(() => import('@/pages/accounts/AccountsPage'));
const CategoriesPage = lazy(() => import('@/pages/categories/CategoriesPage'));
const TransactionsPage = lazy(() => import('@/pages/transactions/TransactionsPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));

// ProtectedRoute: Show loading during hydration, redirect to /login if not authenticated
function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// PublicRoute: Show loading during hydration, redirect to /dashboard if already authenticated
function PublicRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return <LoadingScreen />;
  }

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
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <PageErrorBoundary>
                <ForgotPasswordPage />
              </PageErrorBoundary>
            </PublicRoute>
          }
        />

        {/* Protected routes — wrapped with AppLayout for Sidebar, TopBar, MobileNav */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PageErrorBoundary>
                  <DashboardPage />
                </PageErrorBoundary>
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PageErrorBoundary>
                  <AccountsPage />
                </PageErrorBoundary>
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PageErrorBoundary>
                  <CategoriesPage />
                </PageErrorBoundary>
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PageErrorBoundary>
                  <TransactionsPage />
                </PageErrorBoundary>
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions/new"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PageErrorBoundary>
                  <TransactionsPage />
                </PageErrorBoundary>
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PageErrorBoundary>
                  <ProfilePage />
                </PageErrorBoundary>
              </AppLayout>
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
