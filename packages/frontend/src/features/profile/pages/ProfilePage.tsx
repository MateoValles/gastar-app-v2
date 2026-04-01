import { useTranslation } from 'react-i18next';
import { useUser } from '../hooks/use-user.js';
import { useAuth } from '@/features/auth/hooks/use-auth.js';
import { useUIStore } from '@/stores/ui.store.js';
import { PersonalInfoSection } from '../components/PersonalInfoSection.js';
import { PreferencesSection } from '../components/PreferencesSection.js';
import { LogoutSection } from '../components/LogoutSection.js';
import { Skeleton } from '@/components/ui/skeleton.js';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, isLoading, error, updateProfile } = useUser();
  const { logout } = useAuth();
  const { theme, setTheme } = useUIStore();

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────────

  if (error || !user) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <p className="text-sm text-destructive">{t('errors.generic')}</p>
      </div>
    );
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function handleUpdateName(name: string) {
    updateProfile.mutate({ name });
  }

  function handleLanguageChange(lng: string) {
    updateProfile.mutate({ language: lng as 'es' | 'en' });
  }

  function handleThemeChange(newTheme: typeof theme) {
    setTheme(newTheme);
  }

  function handleLogout() {
    logout.mutate();
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24 md:p-6">
      {/* Header */}
      <h1 className="mb-6 text-2xl font-bold">{t('profile.title')}</h1>

      {/* Content */}
      <div className="flex flex-col gap-4">
        <PersonalInfoSection
          user={user}
          locale={i18n.language}
          onUpdateName={handleUpdateName}
          isUpdating={updateProfile.isPending}
        />

        <PreferencesSection
          language={user.language}
          theme={theme}
          onLanguageChange={handleLanguageChange}
          onThemeChange={handleThemeChange}
        />

        <LogoutSection onLogout={handleLogout} isLoggingOut={logout.isPending} />
      </div>
    </div>
  );
}
