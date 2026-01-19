const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const DAYS_PER_WEEK = 7

const getDaysToFirstMonday = (dayOfWeek: number): number => {
  if (dayOfWeek === 0) return 1
  if (dayOfWeek === 1) return 0
  return 8 - dayOfWeek
}

const getFirstMondayOfYear = (year: number): Date => {
  const jan1 = new Date(year, 0, 1)
  const dayOfWeek = jan1.getDay()
  const daysToFirstMonday = getDaysToFirstMonday(dayOfWeek)
  return new Date(year, 0, 1 + daysToFirstMonday)
}

const daysSince = (fromDate: Date, toDate: Date): number => {
  return Math.floor((toDate.getTime() - fromDate.getTime()) / MILLISECONDS_PER_DAY)
}

export function getCurrentWeek(): { year: number; weekNumber: number } {
  return getWeekOfDate(new Date())
}

export function getWeeksInYear(year: number): number {
  const firstMonday = getFirstMondayOfYear(year)
  const dec31 = new Date(year, 11, 31)
  const daysSinceFirstMonday = daysSince(firstMonday, dec31)
  return Math.floor(daysSinceFirstMonday / DAYS_PER_WEEK) + 1
}

export function formatWeekDisplay(year: number, weekNumber: number): string {
  return `Semana ${weekNumber}, ${year}`
}

export function getWeeksInMonth(year: number, month: number): number[] {
  const weeks = new Set<number>()
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const currentDate = new Date(firstDay)

  while (currentDate <= lastDay) {
    const { weekNumber } = getWeekOfDate(currentDate)
    weeks.add(weekNumber)
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return Array.from(weeks).sort((a, b) => a - b)
}

export function getWeekOfDate(date: Date): { year: number; weekNumber: number } {
  const year = date.getFullYear()
  const firstMonday = getFirstMondayOfYear(year)

  if (date < firstMonday) {
    return {
      year: year - 1,
      weekNumber: getWeeksInYear(year - 1),
    }
  }

  const daysSinceFirstMonday = daysSince(firstMonday, date)
  const weekNumber = Math.floor(daysSinceFirstMonday / DAYS_PER_WEEK) + 1
  const weeksInYear = getWeeksInYear(year)

  if (weekNumber > weeksInYear) {
    return {
      year: year + 1,
      weekNumber: 1,
    }
  }

  return { year, weekNumber }
}
