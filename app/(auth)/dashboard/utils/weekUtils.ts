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
