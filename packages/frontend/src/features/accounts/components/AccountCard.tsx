import { useTranslation } from 'react-i18next';
import {
  Landmark,
  PiggyBank,
  CreditCard,
  Banknote,
  TrendingUp,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card.js';
import { Badge } from '@/components/ui/badge.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.js';
import { Button } from '@/components/ui/button.js';
import { formatMoney } from '@/lib/utils.js';
import type { AccountResponse, AccountType } from '@gastar/shared';

// ─── Currency border colors ────────────────────────────────────────────────────

const CURRENCY_BORDER_COLORS: Record<string, string> = {
  ARS: 'border-l-[#3B82F6]',
  USD: 'border-l-[#16A34A]',
  EUR: 'border-l-[#8B5CF6]',
};

// ─── Account type icons ────────────────────────────────────────────────────────

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ComponentType<{ className?: string }>> = {
  checking: Landmark,
  savings: PiggyBank,
  credit_card: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AccountCardProps {
  account: AccountResponse;
  onEdit: (account: AccountResponse) => void;
  onDelete: (account: AccountResponse) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const { t, i18n } = useTranslation();

  const Icon = ACCOUNT_TYPE_ICONS[account.type] ?? Landmark;
  const borderColor = CURRENCY_BORDER_COLORS[account.currency] ?? 'border-l-border';

  return (
    <Card className={`border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="size-5 text-muted-foreground" />
            <span className="font-medium text-sm">{account.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {account.currency}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" aria-label={t('common.actions')} />}
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(account)}>
                  <Pencil className="size-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(account)}>
                  <Trash2 className="size-4" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t(`accounts.types.${account.type}`)}
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {formatMoney(account.balance, account.currency, i18n.language)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
