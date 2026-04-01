import { useTranslation } from 'react-i18next';
import type { Theme } from '@/stores/ui.store.js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.js';
import { Label } from '@/components/ui/label.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface PreferencesSectionProps {
  language: string;
  theme: Theme;
  onLanguageChange: (lng: string) => void;
  onThemeChange: (theme: Theme) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PreferencesSection({
  language,
  theme,
  onLanguageChange,
  onThemeChange,
}: PreferencesSectionProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.accountSettings')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Language */}
        <div className="flex flex-col gap-1.5">
          <Label>{t('profile.language')}</Label>
          <Select
            value={language}
            onValueChange={(val) => {
              if (val) onLanguageChange(val);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">{t('profile.languages.es')}</SelectItem>
              <SelectItem value="en">{t('profile.languages.en')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Theme */}
        <div className="flex flex-col gap-1.5">
          <Label>{t('profile.theme')}</Label>
          <Select
            value={theme}
            onValueChange={(val) => {
              if (val) onThemeChange(val as Theme);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t('profile.themes.light')}</SelectItem>
              <SelectItem value="dark">{t('profile.themes.dark')}</SelectItem>
              <SelectItem value="system">{t('profile.themes.system')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
