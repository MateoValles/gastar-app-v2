import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card.js';
import { Button } from '@/components/ui/button.js';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog.js';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface LogoutSectionProps {
  onLogout: () => void;
  isLoggingOut: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function LogoutSection({ onLogout, isLoggingOut }: LogoutSectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setOpen(false);
    onLogout();
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <Button variant="destructive" onClick={() => setOpen(true)} disabled={isLoggingOut}>
          {t('auth.logout')}
        </Button>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('auth.logout')}</AlertDialogTitle>
              <AlertDialogDescription>{t('auth.logoutConfirm')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleConfirm}
                disabled={isLoggingOut}
              >
                {t('common.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
