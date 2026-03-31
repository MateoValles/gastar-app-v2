import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a monetary amount using Intl.NumberFormat.
 * @param amount - The amount as a string (from Prisma Decimal serialization)
 * @param currency - ISO 4217 currency code (e.g. "ARS", "USD", "EUR")
 * @param locale - BCP 47 locale string (e.g. "es-AR", "en-US")
 */
export function formatMoney(amount: string, currency: string, locale: string): string {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return amount;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

/**
 * Formats a date string using Intl.DateTimeFormat.
 * @param date - ISO date string (e.g. "2025-03-31T00:00:00.000Z")
 * @param locale - BCP 47 locale string
 */
export function formatDate(date: string, locale: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Formats a date as a relative human-readable string for recent transactions.
 * Falls back to formatDate() for dates older than 7 days.
 * @param date - ISO date string
 * @param locale - BCP 47 locale string
 */
export function formatRelativeDate(date: string, locale: string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Check if it's actually today (same calendar day)
    const today = new Date();
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) {
      // Use relative time if available
      if (typeof Intl.RelativeTimeFormat !== 'undefined') {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        return rtf.format(0, 'day'); // "today" / "hoy"
      }
      return formatDate(date, locale);
    }
  }

  if (diffDays === 1) {
    if (typeof Intl.RelativeTimeFormat !== 'undefined') {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      return rtf.format(-1, 'day'); // "yesterday" / "ayer"
    }
    return formatDate(date, locale);
  }

  if (diffDays < 7) {
    if (typeof Intl.RelativeTimeFormat !== 'undefined') {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      return rtf.format(-diffDays, 'day');
    }
  }

  return formatDate(date, locale);
}
