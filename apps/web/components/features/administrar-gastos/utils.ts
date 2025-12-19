import { EXCLUDED_EXPENSE_TYPES } from './constants'
import type { ExpenseTransaction } from './types'

/**
 * Format a number as Mexican Peso currency (full format)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format a number as compact currency (e.g., $1.2M, $500K)
 */
export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

/**
 * Filter expenses by excluding loan-related types and filtering by selected routes
 */
export function filterExpenses(
  expenses: ExpenseTransaction[],
  selectedRouteIds: string[]
): ExpenseTransaction[] {
  return expenses.filter((expense) => {
    // Exclude loan-related expenses
    if (EXCLUDED_EXPENSE_TYPES.includes(expense.expenseSource || '')) {
      return false
    }
    // Filter by selected routes if multiple selected
    if (selectedRouteIds.length > 1) {
      return selectedRouteIds.includes(expense.route?.id || '')
    }
    return true
  })
}

/**
 * Get routeId for GraphQL query based on selected routes
 * Returns undefined if multiple routes selected (to fetch all)
 */
export function getRouteIdForQuery(selectedRouteIds: string[]): string | undefined {
  return selectedRouteIds.length === 1 ? selectedRouteIds[0] : undefined
}

/**
 * Parse a month string (YYYY-MM) into year and month numbers
 */
export function parseMonthString(monthString: string): { year: number; month: number } {
  const [year, month] = monthString.split('-').map(Number)
  return { year, month }
}

/**
 * Format a month string as "Month YYYY" label
 */
export function formatMonthLabel(monthString: string, monthNames: string[]): string {
  const { year, month } = parseMonthString(monthString)
  return `${monthNames[month - 1]} ${year}`
}

/**
 * Get the last day of a month
 */
export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Calculate month-over-month change percentage
 */
export function calculateChangePercentage(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}
