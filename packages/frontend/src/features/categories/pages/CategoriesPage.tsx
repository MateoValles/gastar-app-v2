import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useCategories } from '../hooks/use-categories.js';
import { CategoryChip } from '../components/CategoryChip.js';
import { CategoryForm } from '../components/CategoryForm.js';
import { CategoriesEmptyState } from '../components/CategoriesEmptyState.js';
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
import type { CategoryResponse, CreateCategoryInput, UpdateCategoryInput } from '@gastar/shared';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { categories, createCategory, updateCategory, deleteCategory } = useCategories();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryResponse | null>(null);

  function handleCreateClick() {
    setEditingCategory(null);
    setFormOpen(true);
  }

  function handleEditClick(category: CategoryResponse) {
    setEditingCategory(category);
    setFormOpen(true);
  }

  function handleDeleteClick(category: CategoryResponse) {
    setDeletingCategory(category);
  }

  function handleFormSubmit(data: CreateCategoryInput | UpdateCategoryInput) {
    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, data: data as UpdateCategoryInput },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      createCategory.mutate(data as CreateCategoryInput, {
        onSuccess: () => setFormOpen(false),
      });
    }
  }

  function handleDeleteConfirm() {
    if (!deletingCategory) return;
    deleteCategory.mutate(deletingCategory.id, {
      onSuccess: () => setDeletingCategory(null),
      onError: () => setDeletingCategory(null),
    });
  }

  // ─── Loading state ───────────────────────────────────────────────────────────

  if (categories.isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
    );
  }

  const categoryList = categories.data ?? [];

  return (
    <div className="p-4 pb-24 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('categories.title')}</h1>
        <Button onClick={handleCreateClick} className="flex">
          <Plus className="size-4" />
          {t('categories.newCategory')}
        </Button>
      </div>

      {/* Empty state */}
      {categoryList.length === 0 ? (
        <CategoriesEmptyState onCreateCategory={handleCreateClick} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categoryList.map((category) => (
            <CategoryChip
              key={category.id}
              category={category}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Create/Edit form */}
      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        onSubmit={handleFormSubmit}
        isLoading={createCategory.isPending || updateCategory.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(open) => {
          if (!open) setDeletingCategory(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('categories.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categories.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteCategory.isPending}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
