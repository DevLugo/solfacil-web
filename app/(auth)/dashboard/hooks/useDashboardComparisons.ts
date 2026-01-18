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
  clientesAlCorriente: number
  clientesEnCV: number
  balance: number
  isCompleted: boolean
  nuevos: number
  renovados: number
  reintegros: number
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
    // Include current week even if not completed (for real-time data)
    const currentWeek = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1] : null
    // Previous week should be the one before current (whether completed or not)
    const previousWeek = weeklyData.length > 1 ? weeklyData[weeklyData.length - 2] : null

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
