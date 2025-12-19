import type { LucideIcon } from 'lucide-react'

export interface ExpenseTransaction {
  id: string
  amount: string
  date: string
  type: string
  expenseSource: string | null
  sourceAccount: {
    id: string
    name: string
    type: string
  } | null
  route: {
    id: string
    name: string
  } | null
  lead: {
    id: string
    personalData: {
      fullName: string
    }
  } | null
}

export interface Route {
  id: string
  name: string
}

export interface ExpenseByCategory {
  category: string
  label: string
  total: number
  count: number
  percentage: number
  icon?: LucideIcon
  color?: string
}

export interface ExpenseByRoute {
  routeId: string
  routeName: string
  total: number
  count: number
  percentage: number
}

export interface ExpenseByAccount {
  accountType: string
  label: string
  total: number
  count: number
  percentage: number
}

export interface MonthlyExpenseData {
  month: string
  monthLabel: string
  total: number
  count: number
  byCategory: Record<string, number>
}

export interface ExpenseKPIsData {
  totalExpenses: number
  totalCount: number
  averagePerExpense: number
  topCategory: string
  topCategoryAmount: number
  topCategoryPercentage: number
  previousMonthTotal: number
  monthOverMonthChange: number
  monthOverMonthPercentage: number
  dailyAverage: number
}

export interface ExpenseInsight {
  type: 'warning' | 'info' | 'success'
  title: string
  description: string
  category?: string
  amount?: number
  percentage?: number
}

export interface ExpenseFilters {
  selectedMonth: string
  selectedRouteIds: string[]
  selectedCategories: string[]
  selectedAccountTypes: string[]
  searchTerm: string
}

// Expense types configuration
export interface ExpenseTypeConfig {
  value: string
  label: string
  icon: LucideIcon
  color: string
}

// Chart data types
export interface CategoryChartData {
  category: string
  label: string
  total: number
  fill: string
}

export interface TrendChartData {
  month: string
  monthLabel: string
  total: number
}

export interface CategoryTrendData {
  category: string
  label: string
  color: string
  currentMonth: number
  previousMonth: number
  change: number
  changePercentage: number
  trend: TrendChartData[]
}

export interface RouteChartData {
  route: string
  total: number
  fill: string
}
