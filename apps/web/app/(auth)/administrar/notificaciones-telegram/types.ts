import {
  DAY_NAMES,
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_STATUS_COLORS,
  REPORT_TYPE_LABELS,
  ISSUE_TYPE_LABELS,
} from '@solufacil/shared'

export interface TelegramUser {
  id: string
  chatId: string
  name: string
  username?: string
  isActive: boolean
  registeredAt: string
  lastActivity: string
  reportsReceived: number
  isInRecipientsList: boolean
  notes?: string
  platformUser?: PlatformUser
}

export interface PlatformUser {
  id: string
  email: string
  role: string
  employee?: {
    id: string
    personalData?: {
      fullName: string
    }
  }
}

export interface TelegramUserStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  linkedToPlataform: number
  inRecipientsList: number
}

export interface Route {
  id: string
  name: string
}

export interface ReportSchedule {
  days: number[]
  hour: string
  timezone: string
}

export interface ReportConfig {
  id: string
  name: string
  reportType: 'NOTIFICACION_TIEMPO_REAL' | 'CREDITOS_CON_ERRORES'
  schedule?: ReportSchedule
  isActive: boolean
  routes: Route[]
  telegramRecipients: TelegramUser[]
  executionLogs?: ReportExecutionLog[]
}

export interface ReportExecutionLog {
  id: string
  status: string
  executionType: string
  startTime: string
  recipientsCount?: number
  successfulDeliveries?: number
  failedDeliveries?: number
}

export interface DocumentNotificationLog {
  id: string
  documentType: string
  personName: string
  routeName: string
  issueType: 'ERROR' | 'MISSING'
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRY'
  telegramChatId: string
  sentAt?: string
  retryCount: number
  createdAt: string
}

// Re-export from shared for convenience
export {
  DAY_NAMES,
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_STATUS_COLORS,
  REPORT_TYPE_LABELS,
  ISSUE_TYPE_LABELS,
}
