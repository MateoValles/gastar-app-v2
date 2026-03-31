import { Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.js';

interface CategoriesEmptyStateProps {
  onCreateCategory: () => void;
}

export function CategoriesEmptyState({ onCreateCategory }: CategoriesEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <Tag className="size-12 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{t('categories.noCategories')}</h3>
      </div>
      <Button onClick={onCreateCategory}>{t('categories.newCategory')}</Button>
    </div>
  );
}
