/**
 * Utility functions for summary tab
 * Note: Transaction processing and balance calculations are now done server-side
 * in TransactionSummaryService
 */

/**
 * Create date range for query (UTC, 6am start - next day 5:59am end)
 * This matches the business day (6am to 6am next day)
 */
export function createDateRange(selectedDate: Date): { startDate: string; endDate: string } {
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()
  const day = selectedDate.getDate()

  const startDate = new Date(Date.UTC(year, month, day, 6, 0, 0, 0))
  const endDate = new Date(Date.UTC(year, month, day + 1, 5, 59, 59, 999))

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  }
}

/**
 * Get week date range (Monday to Sunday)
 */
export function getWeekDateRange(selectedDate: Date): { startDate: string; endDate: string } {
  const startOfWeek = new Date(selectedDate)
  const dayOfWeek = startOfWeek.getDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  startOfWeek.setDate(startOfWeek.getDate() + daysToMonday)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 6)

  const startYear = startOfWeek.getFullYear()
  const startMonth = startOfWeek.getMonth()
  const startDay = startOfWeek.getDate()

  const endYear = endOfWeek.getFullYear()
  const endMonth = endOfWeek.getMonth()
  const endDay = endOfWeek.getDate()

  return {
    startDate: new Date(Date.UTC(startYear, startMonth, startDay, 6, 0, 0, 0)).toISOString(),
    endDate: new Date(Date.UTC(endYear, endMonth, endDay + 1, 5, 59, 59, 999)).toISOString(),
  }
}
