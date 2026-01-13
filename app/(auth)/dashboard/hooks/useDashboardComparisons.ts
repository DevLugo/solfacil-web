'use client'

import { useMemo } from 'react'

export interface WeeklyPortfolioData {
  weekRange: {
    start: string
    end: string
    weekNumber: number
    year: number
  }
  clientesActivos: number
  clientesEnCV: number
  balance: number
  isCompleted: boolean
}

export interface WeeklyComparison {
  currentWeek: WeeklyPortfolioData | null
  previousWeek: WeeklyPortfolioData | null
  monthStart: {
    clientesActivos: number
    clientesEnCV: number
  } | null
  deltas: {
    clientesActivosVsPrev: number
    clientesEnCVVsPrev: number
    clientesActivosVsStart: number
    clientesEnCVVsStart: number
  }
}

export function useDashboardComparisons(
  weeklyData: WeeklyPortfolioData[],
  clientesActivosInicio?: number,
  clientesEnCVInicio?: number
): WeeklyComparison {
  return useMemo(() => {
    const completedWeeks = weeklyData.filter(w => w.isCompleted)
    const currentWeek = completedWeeks.length > 0 ? completedWeeks[completedWeeks.length - 1] : null
    const previousWeek = completedWeeks.length > 1 ? completedWeeks[completedWeeks.length - 2] : null

    const deltas = {
      clientesActivosVsPrev: currentWeek && previousWeek
        ? currentWeek.clientesActivos - previousWeek.clientesActivos
        : 0,
      clientesEnCVVsPrev: currentWeek && previousWeek
        ? currentWeek.clientesEnCV - previousWeek.clientesEnCV
        : 0,
      clientesActivosVsStart: currentWeek && clientesActivosInicio !== undefined
        ? currentWeek.clientesActivos - clientesActivosInicio
        : 0,
      clientesEnCVVsStart: currentWeek && clientesEnCVInicio !== undefined
        ? currentWeek.clientesEnCV - clientesEnCVInicio
        : 0,
    }

    return {
      currentWeek,
      previousWeek,
      monthStart: clientesActivosInicio !== undefined ? {
        clientesActivos: clientesActivosInicio,
        clientesEnCV: clientesEnCVInicio ?? 0,
      } : null,
      deltas,
    }
  }, [weeklyData, clientesActivosInicio, clientesEnCVInicio])
}
