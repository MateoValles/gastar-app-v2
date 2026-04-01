import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { ExpenseByCategoryItem } from '@gastar/shared';

// ─── Constants ─────────────────────────────────────────────────────────────────

const FALLBACK_COLOR = '#94A3B8';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ExpensesByCategoryProps {
  expenses: ExpenseByCategoryItem[];
  currency: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ExpensesByCategory({ expenses, currency }: ExpensesByCategoryProps) {
  const { t } = useTranslation();

  if (expenses.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        {t('dashboard.noTransactions')}
      </div>
    );
  }

  const data = expenses.map((expense) => ({
    name: expense.categoryName,
    value: parseFloat(expense.total),
    color: expense.categoryColor ?? FALLBACK_COLOR,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${String(value)} ${currency}`, '']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
