import { describe, it, expect } from 'vitest';
import { cn, formatMoney, formatDate, formatRelativeDate } from '../utils.js';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('merges tailwind classes correctly (last wins)', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});

describe('formatMoney', () => {
  it('formats ARS currency in es-AR locale', () => {
    const result = formatMoney('1500.50', 'ARS', 'es-AR');
    expect(result).toContain('1.500,50');
    expect(result).toContain('$');
  });

  it('formats USD currency in en-US locale', () => {
    const result = formatMoney('1500.50', 'USD', 'en-US');
    expect(result).toContain('1,500.50');
    expect(result).toContain('$');
  });

  it('handles zero amount', () => {
    const result = formatMoney('0', 'USD', 'en-US');
    expect(result).toContain('0.00');
  });

  it('returns original string for invalid amount', () => {
    const result = formatMoney('not-a-number', 'USD', 'en-US');
    expect(result).toBe('not-a-number');
  });

  it('formats EUR currency', () => {
    const result = formatMoney('1000', 'EUR', 'en-US');
    expect(result).toContain('1,000.00');
  });
});

describe('formatDate', () => {
  it('formats date in es locale', () => {
    // 2025-03-31 in es-AR: 31/03/2025
    const result = formatDate('2025-03-31T12:00:00.000Z', 'es-AR');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('formats date in en-US locale', () => {
    const result = formatDate('2025-03-31T12:00:00.000Z', 'en-US');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('returns original string for invalid date', () => {
    const result = formatDate('not-a-date', 'en-US');
    expect(result).toBe('not-a-date');
  });
});

describe('formatRelativeDate', () => {
  it('returns a string for a recent date', () => {
    // Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatRelativeDate(yesterday.toISOString(), 'es');
    // Should return "ayer" or similar relative time
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a formatted date for old dates', () => {
    const oldDate = '2020-01-01T00:00:00.000Z';
    const result = formatRelativeDate(oldDate, 'en-US');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('returns original string for invalid date', () => {
    const result = formatRelativeDate('invalid', 'es');
    expect(result).toBe('invalid');
  });

  it('returns "today" or equivalent for today\'s date', () => {
    const today = new Date().toISOString();
    const result = formatRelativeDate(today, 'en');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
