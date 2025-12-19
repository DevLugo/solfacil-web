import { gql } from '@apollo/client'

export const GET_TELEGRAM_USERS = gql`
  query GetTelegramUsers($filters: TelegramUserFiltersInput, $limit: Int, $offset: Int) {
    telegramUsers(filters: $filters, limit: $limit, offset: $offset) {
      id
      chatId
      name
      username
      isActive
      registeredAt
      lastActivity
      reportsReceived
      isInRecipientsList
      notes
      platformUser {
        id
        email
        role
      }
    }
  }
`

export const GET_TELEGRAM_USER_STATS = gql`
  query GetTelegramUserStats {
    telegramUserStats {
      totalUsers
      activeUsers
      inactiveUsers
      linkedToPlataform
      inRecipientsList
    }
  }
`

export const GET_PLATFORM_USERS = gql`
  query GetPlatformUsers {
    users {
      id
      email
      role
      employee {
        id
        personalData {
          fullName
        }
      }
    }
  }
`

export const GET_REPORT_CONFIGS = gql`
  query GetReportConfigs($isActive: Boolean) {
    reportConfigs(isActive: $isActive) {
      id
      name
      reportType
      schedule {
        days
        hour
        timezone
      }
      isActive
      routes {
        id
        name
      }
      telegramRecipients {
        id
        name
        chatId
      }
      executionLogs {
        id
        status
        executionType
        startTime
        recipientsCount
        successfulDeliveries
        failedDeliveries
      }
    }
  }
`

export const GET_DOCUMENT_NOTIFICATION_LOGS = gql`
  query GetDocumentNotificationLogs(
    $routeId: ID
    $status: NotificationStatus
    $fromDate: DateTime
    $toDate: DateTime
    $limit: Int
    $offset: Int
  ) {
    documentNotificationLogs(
      routeId: $routeId
      status: $status
      fromDate: $fromDate
      toDate: $toDate
      limit: $limit
      offset: $offset
    ) {
      id
      documentType
      personName
      routeName
      issueType
      status
      telegramChatId
      sentAt
      retryCount
      createdAt
    }
  }
`

export const GET_ROUTES = gql`
  query GetRoutes {
    routes {
      id
      name
    }
  }
`

// Mutations
export const ACTIVATE_TELEGRAM_USER = gql`
  mutation ActivateTelegramUser($id: ID!) {
    activateTelegramUser(id: $id) {
      id
      isActive
    }
  }
`

export const DEACTIVATE_TELEGRAM_USER = gql`
  mutation DeactivateTelegramUser($id: ID!) {
    deactivateTelegramUser(id: $id) {
      id
      isActive
    }
  }
`

export const UPDATE_TELEGRAM_USER = gql`
  mutation UpdateTelegramUser($id: ID!, $input: UpdateTelegramUserInput!) {
    updateTelegramUser(id: $id, input: $input) {
      id
      isActive
      isInRecipientsList
      notes
    }
  }
`

export const LINK_TELEGRAM_TO_USER = gql`
  mutation LinkTelegramToUser($input: LinkTelegramToUserInput!) {
    linkTelegramToUser(input: $input) {
      id
      platformUser {
        id
        email
      }
    }
  }
`

export const UNLINK_TELEGRAM_FROM_USER = gql`
  mutation UnlinkTelegramFromUser($telegramUserId: ID!) {
    unlinkTelegramFromUser(telegramUserId: $telegramUserId) {
      id
      platformUser {
        id
      }
    }
  }
`

export const CREATE_REPORT_CONFIG = gql`
  mutation CreateReportConfig($input: CreateReportConfigInput!) {
    createReportConfig(input: $input) {
      id
      name
      reportType
      isActive
    }
  }
`

export const UPDATE_REPORT_CONFIG = gql`
  mutation UpdateReportConfig($id: ID!, $input: UpdateReportConfigInput!) {
    updateReportConfig(id: $id, input: $input) {
      id
      name
      schedule {
        days
        hour
        timezone
      }
      isActive
    }
  }
`

export const DELETE_REPORT_CONFIG = gql`
  mutation DeleteReportConfig($id: ID!) {
    deleteReportConfig(id: $id)
  }
`

export const TOGGLE_REPORT_CONFIG = gql`
  mutation ToggleReportConfig($id: ID!) {
    toggleReportConfig(id: $id) {
      id
      isActive
    }
  }
`

export const EXECUTE_REPORT_MANUALLY = gql`
  mutation ExecuteReportManually($reportConfigId: ID!) {
    executeReportManually(reportConfigId: $reportConfigId) {
      success
      message
      recipientsNotified
      errors
    }
  }
`

export const RETRY_FAILED_NOTIFICATION = gql`
  mutation RetryFailedNotification($notificationId: ID!) {
    retryFailedNotification(notificationId: $notificationId) {
      success
      message
    }
  }
`
