// Core KPI Components
export { KPICard } from './KPICard'
export { DashboardKPIRow } from './DashboardKPIRow'

// Table/List Components
export { WeeklyComparisonTable } from './WeeklyComparisonTable'
export { WeeklyTransactionsCard } from './WeeklyTransactionsCard'
export { WeeklyExpensesCard } from './WeeklyExpensesCard'

// Alert/Critical Components
export { LocalityAlertsCard, type LocalityAlert } from './LocalityAlertsCard'
export { CriticalClientsCard } from './CriticalClientsCard'

// Chart Components
export { WeeklyActivityChart } from './WeeklyActivityChart'

// Location Components
export { TopLocationsCard } from './TopLocationsCard'
export { NewLocationsCard } from './NewLocationsCard'

// Specialized Cards
export { RecoveredDeadDebtCard } from './RecoveredDeadDebtCard'

// Layout Components
export { DashboardHeader } from './DashboardHeader'
export { WeekSelector } from './WeekSelector'

// Types
export type {
  Route,
  LocationCreated,
  TopLocation,
  RecoveredDeadDebtSummary,
  RecoveredDeadDebtPayment,
  RecoveredDeadDebtData,
  WeeklyChartDataPoint,
  WeeklyComparisonData,
} from './types'
