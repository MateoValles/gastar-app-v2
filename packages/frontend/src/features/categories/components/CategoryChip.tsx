import { useTranslation } from 'react-i18next';
import { Tag, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.js';
import { Button } from '@/components/ui/button.js';
import { ICON_OPTIONS } from '../constants/category-options.js';
import type { CategoryResponse } from '@gastar/shared';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CategoryChipProps {
  category: CategoryResponse;
  onEdit: (category: CategoryResponse) => void;
  onDelete: (category: CategoryResponse) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function CategoryChip({ category, onEdit, onDelete }: CategoryChipProps) {
  const { t } = useTranslation();

  const iconOption = ICON_OPTIONS.find((opt) => opt.name === category.icon);
  const Icon = iconOption?.Icon ?? Tag;
  const color = category.color ?? undefined;

  return (
    <Card className="flex items-center justify-between gap-3 px-3 py-2.5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Color dot */}
        <span
          className="size-3 shrink-0 rounded-full border border-border"
          style={color ? { backgroundColor: color } : undefined}
          aria-hidden="true"
        />
        {/* Icon */}
        <Icon
          className="size-4 shrink-0 text-muted-foreground"
          style={color ? { color } : undefined}
        />
        {/* Name */}
        <span className="truncate text-sm font-medium">{category.name}</span>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={t('common.actions')} />}
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(category)}>
            <Pencil className="size-4" />
            {t('common.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(category)}>
            <Trash2 className="size-4" />
            {t('common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
}
