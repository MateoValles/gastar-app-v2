import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { ICON_OPTIONS } from '../constants/category-options.js';
import { cn } from '@/lib/utils.js';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface IconPickerProps {
  value: string | undefined;
  onChange: (iconName: string) => void;
  disabled?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function IconPicker({ value, onChange, disabled = false }: IconPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = ICON_OPTIONS.find((opt) => opt.name === value);
  const SelectedIcon = selectedOption?.Icon ?? null;

  const filtered = search.trim()
    ? ICON_OPTIONS.filter((opt) => opt.name.toLowerCase().includes(search.toLowerCase()))
    : ICON_OPTIONS;

  function handleSelect(iconName: string) {
    onChange(iconName);
    setOpen(false);
    setSearch('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            aria-label={t('categories.categoryIcon')}
          />
        }
      >
        {SelectedIcon ? (
          <>
            <SelectedIcon className="size-4 shrink-0" />
            <span className="truncate">{value}</span>
          </>
        ) : (
          <>
            <Tag className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{t('categories.categoryIcon')}</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8"
          autoFocus
        />
        <div className="grid max-h-48 grid-cols-7 gap-1 overflow-y-auto">
          {filtered.map(({ name, Icon }) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              aria-pressed={value === name}
              onClick={() => handleSelect(name)}
              className={cn(
                'flex items-center justify-center rounded-md p-1.5 hover:bg-muted transition-colors',
                value === name && 'bg-primary/10 ring-1 ring-primary',
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
          {filtered.length === 0 && (
            <span className="col-span-7 py-4 text-center text-sm text-muted-foreground">
              {t('common.noResults')}
            </span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
