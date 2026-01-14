/**
 * Week calculation utilities for the frontend
 * Matches the backend week calculation logic (Monday-Sunday weeks)
 */

/**
 * Gets the current week information
 * @returns Object with year and week number
 */
export function getCurrentWeek(): { year: number; weekNumber: number } {
  const now = new Date()
  const year = now.getFullYear()

  // Calculate week number
  const jan1 = new Date(year, 0, 1)
  const dayOfWeek = jan1.getDay()
  const daysToFirstMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday)

  // If we're before the first Monday, we're in the last week of the previous year
  if (now < firstMonday) {
    return {
      year: year - 1,
      weekNumber: getWeeksInYear(year - 1),
    }
  }

  // Calculate days since the first Monday
  const daysSinceFirstMonday = Math.floor(
    (now.getTime() - firstMonday.getTime()) / (24 * 60 * 60 * 1000)
  )
  const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1

  // If the week number exceeds the weeks in the year, we're in week 1 of next year
  const weeksInYear = getWeeksInYear(year)
  if (weekNumber > weeksInYear) {
    return {
      year: year + 1,
      weekNumber: 1,
    }
  }

  return {
    year,
    weekNumber,
  }
}

/**
 * Gets the total number of weeks in a year
 * @param year - The year to calculate
 * @returns Number of weeks (52 or 53)
 */
export function getWeeksInYear(year: number): number {
  const jan1 = new Date(year, 0, 1)
  const dec31 = new Date(year, 11, 31)

  const dayOfWeek = jan1.getDay()
  const daysToFirstMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday)

  const daysSinceFirstMonday = Math.floor(
    (dec31.getTime() - firstMonday.getTime()) / (24 * 60 * 60 * 1000)
  )
  const lastWeekNumber = Math.floor(daysSinceFirstMonday / 7) + 1

  return lastWeekNumber
}

/**
 * Gets the week information for a specific date
 * @param date - The date to check
 * @returns Object with year and week number
 */
export function getWeekOfDate(date: Date): { year: number; weekNumber: number } {
  const year = date.getFullYear()

  const jan1 = new Date(year, 0, 1)
  const dayOfWeek = jan1.getDay()
  const daysToFirstMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday)

  // If the date is before the first Monday, it belongs to the previous year
  if (date < firstMonday) {
    return {
      year: year - 1,
      weekNumber: getWeeksInYear(year - 1),
    }
  }

  const daysSinceFirstMonday = Math.floor(
    (date.getTime() - firstMonday.getTime()) / (24 * 60 * 60 * 1000)
  )
  const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1

  // If the week number exceeds the weeks in the year, it belongs to next year
  const weeksInYear = getWeeksInYear(year)
  if (weekNumber > weeksInYear) {
    return {
      year: year + 1,
      weekNumber: 1,
    }
  }

  return {
    year,
    weekNumber,
  }
}

// ============================================================================
// Week Range Utilities
// ============================================================================

/**
 * Get Monday of the week for a given date
 * @param date - Any date within the week
 * @returns The Monday of that week at 00:00:00
 */
export function getMondayOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay()
  const daysToSubtract = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(date)
  monday.setDate(date.getDate() + daysToSubtract)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/**
 * Get the date range for a week starting from a Monday
 * @param monday - The Monday of the week
 * @returns Object with start (Monday 00:00) and end (Sunday 23:59:59.999)
 */
export function getWeekRange(monday: Date): { start: Date; end: Date } {
  const start = new Date(monday)
  start.setHours(0, 0, 0, 0)
  const end = new Date(monday)
  end.setDate(monday.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Get current and previous week date ranges as ISO strings
 * @param selectedWeekMonday - Optional Monday to use as base (defaults to current date's week)
 * @returns Object with ISO string dates for current and previous week ranges
 */
export function getCurrentAndPreviousWeekRanges(selectedWeekMonday?: Date): {
  currentWeekStart: string
  currentWeekEnd: string
  previousWeekStart: string
  previousWeekEnd: string
} {
  const baseMonday = selectedWeekMonday || new Date()
  const currentMonday = selectedWeekMonday
    ? new Date(selectedWeekMonday.getTime())
    : getMondayOfWeek(baseMonday)
  currentMonday.setHours(0, 0, 0, 0)

  const currentWeek = getWeekRange(currentMonday)

  const previousMonday = new Date(currentMonday)
  previousMonday.setDate(currentMonday.getDate() - 7)
  const previousWeek = getWeekRange(previousMonday)

  return {
    currentWeekStart: currentWeek.start.toISOString(),
    currentWeekEnd: currentWeek.end.toISOString(),
    previousWeekStart: previousWeek.start.toISOString(),
    previousWeekEnd: previousWeek.end.toISOString(),
  }
}

// ============================================================================
// Month Utilities
// ============================================================================

/**
 * Get business days (Mon-Fri) for a week starting from Monday
 * @param monday - The Monday of the week
 * @returns Array of 5 Date objects (Mon-Fri)
 */
export function getBusinessDaysFromMonday(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return day
  })
}

/**
 * Determine the month that has the most business days from a week
 * This is useful when a week spans two months
 * @param monday - The Monday of the week
 * @returns Object with month (1-12) and year
 */
export function getMajorityMonthFromWeek(monday: Date): { month: number; year: number } {
  const businessDays = getBusinessDaysFromMonday(monday)

  const monthCounts = new Map<string, number>()
  for (const day of businessDays) {
    const key = `${day.getFullYear()}-${day.getMonth() + 1}`
    monthCounts.set(key, (monthCounts.get(key) || 0) + 1)
  }

  // Find month with max count
  let maxKey = `${monday.getFullYear()}-${monday.getMonth() + 1}`
  let maxCount = 0
  for (const [key, count] of monthCounts) {
    if (count > maxCount) {
      maxCount = count
      maxKey = key
    }
  }

  const [year, month] = maxKey.split('-').map(Number)
  return { month, year }
}
