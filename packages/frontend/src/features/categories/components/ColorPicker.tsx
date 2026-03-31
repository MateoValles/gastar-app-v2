import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.js';
import { Button } from '@/components/ui/button.js';
import { COLOR_OPTIONS } from '../constants/category-options.js';
import { cn } from '@/lib/utils.js';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ColorPickerProps {
  value: string | undefined;
  onChange: (color: string) => void;
  disabled?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ColorPicker({ value, onChange, disabled = false }: ColorPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  function handleSelect(color: string) {
    onChange(color);
    setOpen(false);
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
            aria-label={t('categories.categoryColor')}
          />
        }
      >
        {value ? (
          <>
            <span
              className="size-4 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: value }}
              aria-hidden="true"
            />
            <span className="font-mono text-sm">{value}</span>
          </>
        ) : (
          <>
            <span className="size-4 shrink-0 rounded-full border border-dashed border-muted-foreground" />
            <span className="text-muted-foreground">{t('categories.categoryColor')}</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-8 gap-1.5">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => handleSelect(color)}
              className={cn(
                'size-6 rounded-full border border-border transition-transform hover:scale-110',
                value === color && 'ring-2 ring-primary ring-offset-2',
              )}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
