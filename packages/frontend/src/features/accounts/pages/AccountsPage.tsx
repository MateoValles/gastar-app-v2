import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useAccounts } from '../hooks/use-accounts.js';
import { AccountCard } from '../components/AccountCard.js';
import { AccountForm } from '../components/AccountForm.js';
import { AccountsEmptyState } from '../components/AccountsEmptyState.js';
import { Button } from '@/components/ui/button.js';
import { Skeleton } from '@/components/ui/skeleton.js';
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
import type { AccountResponse, CreateAccountInput, UpdateAccountInput } from '@gastar/shared';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { t } = useTranslation();
  const { accounts, createAccount, updateAccount, deleteAccount } = useAccounts();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountResponse | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<AccountResponse | null>(null);

  function handleCreateClick() {
    setEditingAccount(null);
    setFormOpen(true);
  }

  function handleEditClick(account: AccountResponse) {
    setEditingAccount(account);
    setFormOpen(true);
  }

  function handleDeleteClick(account: AccountResponse) {
    setDeletingAccount(account);
  }

  function handleFormSubmit(data: CreateAccountInput | UpdateAccountInput) {
    if (editingAccount) {
      updateAccount.mutate(
        { id: editingAccount.id, data: data as UpdateAccountInput },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      createAccount.mutate(data as CreateAccountInput, {
        onSuccess: () => setFormOpen(false),
      });
    }
  }

  function handleDeleteConfirm() {
    if (!deletingAccount) return;
    deleteAccount.mutate(deletingAccount.id, {
      onSuccess: () => setDeletingAccount(null),
      onError: () => setDeletingAccount(null),
    });
  }

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (accounts.isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const accountList = accounts.data ?? [];

  return (
    <div className="p-4 pb-24 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('accounts.title')}</h1>
        <Button onClick={handleCreateClick} className="hidden md:flex">
          <Plus className="size-4" />
          {t('accounts.newAccount')}
        </Button>
      </div>

      {/* Empty state */}
      {accountList.length === 0 ? (
        <AccountsEmptyState onCreateAccount={handleCreateClick} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accountList.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Create/Edit form */}
      <AccountForm
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editingAccount}
        onSubmit={handleFormSubmit}
        isLoading={createAccount.isPending || updateAccount.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingAccount}
        onOpenChange={(open) => {
          if (!open) setDeletingAccount(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accounts.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('accounts.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteAccount.isPending}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
