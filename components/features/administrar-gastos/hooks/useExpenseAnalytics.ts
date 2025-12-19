import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import {
  EXPENSE_TYPES,
  ACCOUNT_TYPES,
  EXPENSE_SOURCE_LABELS,
  ACCOUNT_TYPE_LABELS,
  CHART_COLORS,
} from '../constants'
import { GET_ROUTES, GET_MONTHLY_EXPENSES } from '../queries'
import { filterExpenses, getRouteIdForQuery, calculateChangePercentage } from '../utils'
import type {
  ExpenseTransaction,
  Route,
  ExpenseByCategory,
  ExpenseByRoute,
  ExpenseByAccount,
  ExpenseKPIsData,
  ExpenseInsight,
} from '../types'

interface UseExpenseAnalyticsParams {
  selectedMonth: string
  selectedRouteIds: string[]
}

export function useExpenseAnalytics({ selectedMonth, selectedRouteIds }: UseExpenseAnalyticsParams) {
  // Parse month to get date range
  const { startDate, endDate, previousStartDate, previousEndDate, daysInMonth } = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59, 999)

    // Previous month
    const prevStart = new Date(year, month - 2, 1)
    const prevEnd = new Date(year, month - 1, 0, 23, 59, 59, 999)

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      previousStartDate: prevStart.toISOString(),
      previousEndDate: prevEnd.toISOString(),
      daysInMonth: end.getDate(),
    }
  }, [selectedMonth])

  // Fetch routes
  const { data: routesData, loading: routesLoading } = useQuery<{ routes: Route[] }>(GET_ROUTES)

  const routeId = getRouteIdForQuery(selectedRouteIds)

  // Fetch current month expenses
  const { data: currentData, loading: currentLoading, error: currentError, refetch } = useQuery(
    GET_MONTHLY_EXPENSES,
    {
      variables: { fromDate: startDate, toDate: endDate, routeId },
      skip: !selectedMonth,
    }
  )

  // Fetch previous month expenses for comparison
  const { data: previousData, loading: previousLoading } = useQuery(
    GET_MONTHLY_EXPENSES,
    {
      variables: { fromDate: previousStartDate, toDate: previousEndDate, routeId },
      skip: !selectedMonth,
    }
  )

  // Process expenses - filter excluded types and by selected routes
  const currentExpenses = useMemo(() => {
    const edges = currentData?.transactions?.edges || []
    const expenses = edges.map((edge: { node: ExpenseTransaction }) => edge.node)
    return filterExpenses(expenses, selectedRouteIds)
  }, [currentData, selectedRouteIds])

  const previousExpenses = useMemo(() => {
    const edges = previousData?.transactions?.edges || []
    const expenses = edges.map((edge: { node: ExpenseTransaction }) => edge.node)
    return filterExpenses(expenses, selectedRouteIds)
  }, [previousData, selectedRouteIds])

  // Calculate expenses by category
  const expensesByCategory = useMemo((): ExpenseByCategory[] => {
    const categoryMap = new Map<string, { total: number; count: number }>()

    currentExpenses.forEach((expense: ExpenseTransaction) => {
      const category = expense.expenseSource || 'OTRO'
      const current = categoryMap.get(category) || { total: 0, count: 0 }
      categoryMap.set(category, {
        total: current.total + parseFloat(expense.amount),
        count: current.count + 1,
      })
    })

    const totalAmount = Array.from(categoryMap.values()).reduce((sum, v) => sum + v.total, 0)

    return Array.from(categoryMap.entries())
      .map(([category, data], index) => {
        const typeConfig = EXPENSE_TYPES.find(t => t.value === category)
        return {
          category,
          label: EXPENSE_SOURCE_LABELS[category] || category,
          total: data.total,
          count: data.count,
          percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
          icon: typeConfig?.icon,
          color: typeConfig?.color || CHART_COLORS[index % CHART_COLORS.length],
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [currentExpenses])

  // Calculate expenses by route
  const expensesByRoute = useMemo((): ExpenseByRoute[] => {
    const routeMap = new Map<string, { name: string; total: number; count: number }>()

    currentExpenses.forEach((expense: ExpenseTransaction) => {
      const routeId = expense.route?.id || 'SIN_RUTA'
      const routeName = expense.route?.name || 'Sin Ruta'
      const current = routeMap.get(routeId) || { name: routeName, total: 0, count: 0 }
      routeMap.set(routeId, {
        name: routeName,
        total: current.total + parseFloat(expense.amount),
        count: current.count + 1,
      })
    })

    const totalAmount = Array.from(routeMap.values()).reduce((sum, v) => sum + v.total, 0)

    return Array.from(routeMap.entries())
      .map(([routeId, data]) => ({
        routeId,
        routeName: data.name,
        total: data.total,
        count: data.count,
        percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [currentExpenses])

  // Calculate expenses by account type
  const expensesByAccount = useMemo((): ExpenseByAccount[] => {
    const accountMap = new Map<string, { total: number; count: number }>()

    currentExpenses.forEach((expense: ExpenseTransaction) => {
      const accountType = expense.sourceAccount?.type || 'OTRO'
      const current = accountMap.get(accountType) || { total: 0, count: 0 }
      accountMap.set(accountType, {
        total: current.total + parseFloat(expense.amount),
        count: current.count + 1,
      })
    })

    const totalAmount = Array.from(accountMap.values()).reduce((sum, v) => sum + v.total, 0)

    return Array.from(accountMap.entries())
      .map(([accountType, data], index) => {
        const typeConfig = ACCOUNT_TYPES.find(t => t.value === accountType)
        return {
          accountType,
          label: ACCOUNT_TYPE_LABELS[accountType] || accountType,
          total: data.total,
          count: data.count,
          percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
          color: typeConfig?.color || CHART_COLORS[index % CHART_COLORS.length],
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [currentExpenses])

  // Calculate KPIs
  const kpis = useMemo((): ExpenseKPIsData => {
    const currentTotal = currentExpenses.reduce(
      (sum: number, e: ExpenseTransaction) => sum + parseFloat(e.amount),
      0
    )
    const previousTotal = previousExpenses.reduce(
      (sum: number, e: ExpenseTransaction) => sum + parseFloat(e.amount),
      0
    )

    const topCategory = expensesByCategory[0]
    const change = currentTotal - previousTotal
    const changePercentage = calculateChangePercentage(currentTotal, previousTotal)

    return {
      totalExpenses: currentTotal,
      totalCount: currentExpenses.length,
      averagePerExpense: currentExpenses.length > 0 ? currentTotal / currentExpenses.length : 0,
      topCategory: topCategory?.label || '-',
      topCategoryAmount: topCategory?.total || 0,
      topCategoryPercentage: topCategory?.percentage || 0,
      previousMonthTotal: previousTotal,
      monthOverMonthChange: change,
      monthOverMonthPercentage: changePercentage,
      dailyAverage: daysInMonth > 0 ? currentTotal / daysInMonth : 0,
    }
  }, [currentExpenses, previousExpenses, expensesByCategory, daysInMonth])

  // Generate insights
  const insights = useMemo((): ExpenseInsight[] => {
    const result: ExpenseInsight[] = []

    // Check if expenses increased significantly
    if (kpis.monthOverMonthPercentage > 20) {
      result.push({
        type: 'warning',
        title: 'Aumento significativo',
        description: `Los gastos aumentaron ${kpis.monthOverMonthPercentage.toFixed(1)}% respecto al mes anterior.`,
        percentage: kpis.monthOverMonthPercentage,
      })
    } else if (kpis.monthOverMonthPercentage < -10) {
      result.push({
        type: 'success',
        title: 'Reduccion de gastos',
        description: `Los gastos disminuyeron ${Math.abs(kpis.monthOverMonthPercentage).toFixed(1)}% respecto al mes anterior.`,
        percentage: kpis.monthOverMonthPercentage,
      })
    }

    // Check for high concentration in one category
    if (expensesByCategory[0]?.percentage > 40) {
      result.push({
        type: 'info',
        title: `Alta concentracion en ${expensesByCategory[0].label}`,
        description: `El ${expensesByCategory[0].percentage.toFixed(1)}% de los gastos corresponden a esta categoria. Considera diversificar o negociar mejores tarifas.`,
        category: expensesByCategory[0].category,
        amount: expensesByCategory[0].total,
        percentage: expensesByCategory[0].percentage,
      })
    }

    // Check gasoline expenses
    const gasolineExpense = expensesByCategory.find(c => c.category === 'GASOLINE')
    if (gasolineExpense && gasolineExpense.percentage > 25) {
      result.push({
        type: 'warning',
        title: 'Gastos de gasolina elevados',
        description: `La gasolina representa el ${gasolineExpense.percentage.toFixed(1)}% del gasto total. Considera optimizar rutas o evaluar tarjetas de gasolina con descuentos.`,
        category: 'GASOLINE',
        amount: gasolineExpense.total,
        percentage: gasolineExpense.percentage,
      })
    }

    // Check viatic expenses
    const viaticExpense = expensesByCategory.find(c => c.category === 'VIATIC')
    if (viaticExpense && viaticExpense.percentage > 15) {
      result.push({
        type: 'info',
        title: 'Viaticos significativos',
        description: `Los viaticos representan ${viaticExpense.percentage.toFixed(1)}% del gasto. Puedes establecer limites diarios por empleado.`,
        category: 'VIATIC',
        amount: viaticExpense.total,
        percentage: viaticExpense.percentage,
      })
    }

    // Check if any route has disproportionate expenses
    if (expensesByRoute.length > 1) {
      const avgPerRoute = kpis.totalExpenses / expensesByRoute.length
      const highExpenseRoute = expensesByRoute.find(r => r.total > avgPerRoute * 1.5)
      if (highExpenseRoute) {
        result.push({
          type: 'info',
          title: `${highExpenseRoute.routeName} con gastos elevados`,
          description: `Esta ruta tiene ${((highExpenseRoute.total / avgPerRoute - 1) * 100).toFixed(0)}% mas gastos que el promedio. Revisa la eficiencia operativa.`,
          amount: highExpenseRoute.total,
        })
      }
    }

    return result
  }, [kpis, expensesByCategory, expensesByRoute])

  return {
    routes: routesData?.routes || [],
    expenses: currentExpenses,
    expensesByCategory,
    expensesByRoute,
    expensesByAccount,
    kpis,
    insights,
    loading: currentLoading || previousLoading || routesLoading,
    error: currentError,
    refetch,
  }
}
