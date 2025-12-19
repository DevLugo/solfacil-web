import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { EXPENSE_TYPES, MONTH_NAMES_SHORT } from '../constants'
import { GET_EXPENSES_FOR_PERIOD } from '../queries'
import { filterExpenses, getRouteIdForQuery, calculateChangePercentage } from '../utils'
import type { ExpenseTransaction, CategoryTrendData, TrendChartData } from '../types'

interface UseExpenseTrendParams {
  selectedMonth: string
  selectedRouteIds: string[]
  monthsToFetch?: number
}

export function useExpenseTrend({
  selectedMonth,
  selectedRouteIds,
  monthsToFetch = 6,
}: UseExpenseTrendParams) {
  // Calculate date range for the last N months
  const { startDate, endDate, monthRanges } = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)

    // Generate month ranges for categorization (going back from selected month)
    const ranges: { key: string; label: string }[] = []
    for (let i = monthsToFetch - 1; i >= 0; i--) {
      // Calculate the month we're looking at (month is 1-indexed from the string)
      const targetDate = new Date(year, month - 1 - i, 1)
      const targetYear = targetDate.getFullYear()
      const targetMonth = targetDate.getMonth() // 0-indexed

      ranges.push({
        key: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`,
        label: `${MONTH_NAMES_SHORT[targetMonth]} ${targetYear.toString().slice(2)}`,
      })
    }

    // Calculate start date (first day of oldest month in range)
    const firstRange = ranges[0]
    const [startYear, startMonth] = firstRange.key.split('-').map(Number)
    // Use noon UTC to avoid timezone issues
    const fromDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01T00:00:00.000Z`

    // Calculate end date (last day of selected month)
    const lastDay = new Date(year, month, 0).getDate() // Get last day of month
    const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`

    return {
      startDate: fromDate,
      endDate: toDate,
      monthRanges: ranges,
    }
  }, [selectedMonth, monthsToFetch])

  // Fetch expenses for the entire period
  const { data, loading, error } = useQuery(GET_EXPENSES_FOR_PERIOD, {
    variables: {
      fromDate: startDate,
      toDate: endDate,
      routeId: getRouteIdForQuery(selectedRouteIds),
    },
    skip: !selectedMonth,
  })

  // Process expenses into monthly buckets by category
  const trendData = useMemo(() => {
    const edges = data?.transactions?.edges || []
    const rawExpenses = edges.map((edge: { node: ExpenseTransaction }) => edge.node)
    const expenses = filterExpenses(rawExpenses, selectedRouteIds)

    // Initialize data structure: category -> month -> total
    const categoryMonthData: Record<string, Record<string, number>> = {}

    // Create a set of valid month keys for quick lookup
    const validMonthKeys = new Set(monthRanges.map((r) => r.key))

    expenses.forEach((expense: ExpenseTransaction) => {
      const category = expense.expenseSource || 'OTRO'
      const amount = parseFloat(expense.amount)

      // Extract year and month directly from ISO string to avoid timezone issues
      const expenseMonthKey = expense.date.substring(0, 7)

      if (validMonthKeys.has(expenseMonthKey)) {
        if (!categoryMonthData[category]) {
          categoryMonthData[category] = {}
        }
        categoryMonthData[category][expenseMonthKey] =
          (categoryMonthData[category][expenseMonthKey] || 0) + amount
      }
    })

    // Calculate total per month for overall trend
    const monthlyTotals: TrendChartData[] = monthRanges.map((range) => {
      const total = Object.values(categoryMonthData).reduce(
        (sum, categoryData) => sum + (categoryData[range.key] || 0),
        0
      )
      return {
        month: range.key,
        monthLabel: range.label,
        total,
      }
    })

    // Build category trend data
    const categoryTrends: CategoryTrendData[] = Object.entries(categoryMonthData)
      .map(([category, monthData]) => {
        const typeConfig = EXPENSE_TYPES.find((t) => t.value === category)
        const currentMonthKey = monthRanges[monthRanges.length - 1]?.key
        const previousMonthKey = monthRanges[monthRanges.length - 2]?.key

        const currentMonth = monthData[currentMonthKey] || 0
        const previousMonth = monthData[previousMonthKey] || 0
        const change = currentMonth - previousMonth
        const changePercentage = calculateChangePercentage(currentMonth, previousMonth)

        const trend: TrendChartData[] = monthRanges.map((range) => ({
          month: range.key,
          monthLabel: range.label,
          total: monthData[range.key] || 0,
        }))

        return {
          category,
          label: typeConfig?.label || category,
          color: typeConfig?.color || 'hsl(220, 14%, 46%)',
          currentMonth,
          previousMonth,
          change,
          changePercentage,
          trend,
        }
      })
      .sort((a, b) => b.currentMonth - a.currentMonth)

    return {
      monthlyTotals,
      categoryTrends,
      monthRanges,
    }
  }, [data, selectedRouteIds, monthRanges])

  // Helper function to get trend data for a specific category
  const getCategoryTrend = (category: string): CategoryTrendData | undefined => {
    return trendData.categoryTrends.find((t) => t.category === category)
  }

  return {
    monthlyTotals: trendData.monthlyTotals,
    categoryTrends: trendData.categoryTrends,
    getCategoryTrend,
    loading,
    error,
  }
}
