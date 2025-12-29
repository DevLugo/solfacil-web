import { gql } from '@apollo/client'

// ============================================================
// ROUTES & ACCOUNTS
// ============================================================

export const ROUTES_QUERY = gql`
  query Routes {
    routes {
      id
      name
    }
  }
`

export const ROUTES_WITH_ACCOUNTS_QUERY = gql`
  query RoutesWithAccounts {
    routes {
      id
      name
      accounts {
        id
        name
        type
        amount
        accountBalance
      }
    }
  }
`

export const ACCOUNTS_QUERY = gql`
  query Accounts($routeId: ID, $type: AccountType) {
    accounts(routeId: $routeId, type: $type) {
      id
      name
      type
      amount
      accountBalance
    }
  }
`

// ============================================================
// TRANSACTIONS
// ============================================================

export const TRANSACTIONS_QUERY = gql`
  query Transactions(
    $type: TransactionType
    $routeId: ID
    $accountId: ID
    $fromDate: DateTime
    $toDate: DateTime
    $limit: Int
    $offset: Int
  ) {
    transactions(
      type: $type
      routeId: $routeId
      accountId: $accountId
      fromDate: $fromDate
      toDate: $toDate
      limit: $limit
      offset: $offset
    ) {
      edges {
        node {
          id
          amount
          date
          type
          incomeSource
          expenseSource
          profitAmount
          returnToCapital
          loan {
            id
            amountGived
            borrower {
              personalData {
                id
                fullName
              }
            }
          }
          loanPayment {
            id
            amount
            comission
            paymentMethod
          }
          sourceAccount {
            id
            name
            type
          }
          destinationAccount {
            id
            name
            type
          }
          route {
            id
            name
          }
          lead {
            id
            personalData {
              id
              fullName
              addresses {
                id
                location {
                  id
                  name
                }
              }
            }
          }
          createdAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`

// ============================================================
// LOANS - Para Tab de Créditos
// ============================================================

export const LOANS_BY_DATE_LEAD_QUERY = gql`
  query LoansByDateLead($fromDate: DateTime!, $toDate: DateTime!, $leadId: ID!) {
    loans(fromDate: $fromDate, toDate: $toDate, leadId: $leadId, status: ACTIVE) {
      edges {
        node {
          id
          requestedAmount
          amountGived
          signDate
          comissionAmount
          totalDebtAcquired
          expectedWeeklyPayment
          pendingAmountStored
          profitAmount
          status
          loantype {
            id
            name
            rate
            weekDuration
            loanPaymentComission
            loanGrantedComission
          }
          borrower {
            id
            personalData {
              id
              fullName
              phones {
                id
                number
              }
            }
          }
          collaterals {
            id
            fullName
            phones {
              id
              number
            }
          }
          lead {
            id
            personalData {
              id
              fullName
              addresses {
                id
                location {
                  id
                  name
                }
              }
            }
          }
          previousLoan {
            id
            requestedAmount
            amountGived
            profitAmount
            pendingAmountStored
            borrower {
              personalData {
                id
                fullName
              }
            }
          }
        }
      }
      totalCount
    }
  }
`

export const LOAN_TYPES_QUERY = gql`
  query LoanTypes {
    loantypes {
      id
      name
      weekDuration
      rate
      loanPaymentComission
      loanGrantedComission
    }
  }
`

export const PREVIOUS_LOANS_QUERY = gql`
  query PreviousLoans($leadId: ID!) {
    loans(leadId: $leadId, status: FINISHED, limit: 50) {
      edges {
        node {
          id
          requestedAmount
          amountGived
          profitAmount
          signDate
          pendingAmountStored
          status
          loantype {
            id
            rate
            weekDuration
          }
          borrower {
            id
            personalData {
              id
              fullName
              phones {
                number
              }
            }
          }
          collaterals {
            id
            fullName
            phones {
              id
              number
            }
          }
          lead {
            id
            personalData {
              id
              addresses {
                id
                location {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`

// ============================================================
// PAYMENTS - Para Tab de Abonos
// ============================================================

// Query para obtener pagos de un préstamo específico (usado en cancelación)
export const LOAN_PAYMENTS_BY_LOAN_QUERY = gql`
  query LoanPaymentsByLoan($loanId: ID!) {
    loanPayments(loanId: $loanId, limit: 100) {
      id
      amount
      comission
      receivedAt
      paymentMethod
    }
  }
`

export const LEAD_PAYMENTS_QUERY = gql`
  query LeadPayments($fromDate: DateTime!, $toDate: DateTime!, $leadId: ID!) {
    loanPayments(loanId: $leadId, limit: 100) {
      id
      amount
      comission
      receivedAt
      paymentMethod
      type
      loan {
        id
        requestedAmount
        amountGived
        signDate
        expectedWeeklyPayment
        pendingAmountStored
        status
        borrower {
          id
          personalData {
            id
            fullName
            phones {
              id
              number
            }
          }
        }
        collaterals {
          id
          fullName
          phones {
            id
            number
          }
        }
        loantype {
          id
          name
          weekDuration
        }
      }
    }
  }
`

export const LEAD_PAYMENT_RECEIVED_BY_DATE_QUERY = gql`
  query LeadPaymentReceivedByDate($leadId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
    leadPaymentReceivedByLeadAndDate(leadId: $leadId, startDate: $startDate, endDate: $endDate) {
      id
      expectedAmount
      paidAmount
      cashPaidAmount
      bankPaidAmount
      falcoAmount
      paymentStatus
    }
  }
`

// Query to get LeadPaymentReceived by ID (for edit distribution modal)
export const LEAD_PAYMENT_RECEIVED_BY_ID_QUERY = gql`
  query LeadPaymentReceivedById($id: ID!) {
    leadPaymentReceivedById(id: $id) {
      id
      expectedAmount
      paidAmount
      cashPaidAmount
      bankPaidAmount
      falcoAmount
      paymentStatus
      payments {
        id
        amount
        paymentMethod
      }
    }
  }
`

// Query to get loan payments by lead and date (Keystone approach)
// Gets payments directly with leadPaymentReceived included
export const LOAN_PAYMENTS_BY_LEAD_AND_DATE_QUERY = gql`
  query LoanPaymentsByLeadAndDate($leadId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
    loanPaymentsByLeadAndDate(leadId: $leadId, startDate: $startDate, endDate: $endDate) {
      id
      amount
      comission
      receivedAt
      paymentMethod
      type
      loan {
        id
        borrower {
          id
          personalData {
            id
            fullName
          }
        }
      }
      leadPaymentReceived {
        id
        expectedAmount
        paidAmount
        cashPaidAmount
        bankPaidAmount
        paymentStatus
      }
    }
  }
`

export const ACTIVE_LOANS_BY_LEAD_QUERY = gql`
  query ActiveLoansByLead($leadId: ID!) {
    loans(leadId: $leadId, statuses: [ACTIVE, FINISHED], limit: 100) {
      edges {
        node {
          id
          requestedAmount
          amountGived
          signDate
          expectedWeeklyPayment
          totalPaid
          pendingAmountStored
          status
          loantype {
            id
            name
            weekDuration
            loanPaymentComission
          }
          collaterals {
            id
            fullName
            phones {
              id
              number
            }
          }
          borrower {
            id
            personalData {
              id
              fullName
              phones {
                number
              }
            }
          }
          payments {
            id
            amount
            comission
            receivedAt
            paymentMethod
            leadPaymentReceived {
              id
            }
            transactions {
              id
              profitAmount
              returnToCapital
            }
          }
        }
      }
      totalCount
    }
  }
`

// ============================================================
// EXPENSES - Para Tab de Gastos
// ============================================================

export const EXPENSES_BY_DATE_QUERY = gql`
  query ExpensesByDate($fromDate: DateTime!, $toDate: DateTime!, $routeId: ID!) {
    transactions(
      type: EXPENSE
      routeId: $routeId
      fromDate: $fromDate
      toDate: $toDate
      limit: 100
    ) {
      edges {
        node {
          id
          amount
          date
          type
          expenseSource
          description
          sourceAccount {
            id
            name
            type
          }
          route {
            id
            name
          }
          lead {
            id
            personalData {
              id
              fullName
            }
          }
          createdAt
        }
      }
      totalCount
    }
  }
`

// ============================================================
// TRANSFERS - Para Tab de Transferencias
// ============================================================

export const TRANSFERS_BY_DATE_QUERY = gql`
  query TransfersByDate($fromDate: DateTime!, $toDate: DateTime!, $routeId: ID!) {
    transactions(
      type: TRANSFER
      routeId: $routeId
      fromDate: $fromDate
      toDate: $toDate
      limit: 100
    ) {
      edges {
        node {
          id
          amount
          date
          type
          sourceAccount {
            id
            name
            type
          }
          destinationAccount {
            id
            name
            type
          }
          route {
            id
            name
          }
          createdAt
        }
      }
      totalCount
    }
  }
`

// Query para transferencias E inversiones de capital (incluye TRANSFER e INCOME/MONEY_INVESTMENT)
export const TRANSFERS_AND_INVESTMENTS_BY_DATE_QUERY = gql`
  query TransfersAndInvestmentsByDate($fromDate: DateTime!, $toDate: DateTime!, $routeId: ID!) {
    transfers: transactions(
      type: TRANSFER
      routeId: $routeId
      fromDate: $fromDate
      toDate: $toDate
      limit: 100
    ) {
      edges {
        node {
          id
          amount
          date
          type
          incomeSource
          sourceAccount {
            id
            name
            type
          }
          destinationAccount {
            id
            name
            type
          }
          route {
            id
            name
          }
          createdAt
        }
      }
      totalCount
    }
    investments: transactions(
      type: INCOME
      routeId: $routeId
      fromDate: $fromDate
      toDate: $toDate
      limit: 100
    ) {
      edges {
        node {
          id
          amount
          date
          type
          incomeSource
          sourceAccount {
            id
            name
            type
          }
          destinationAccount {
            id
            name
            type
          }
          route {
            id
            name
          }
          createdAt
        }
      }
      totalCount
    }
  }
`

// ============================================================
// SUMMARY - Para Tab de Resumen
// ============================================================

// Query to get INCOME transactions (payments received) for summary
export const INCOME_TRANSACTIONS_BY_DATE_QUERY = gql`
  query IncomeTransactionsByDate($fromDate: DateTime!, $toDate: DateTime!, $routeId: ID!) {
    transactions(
      type: INCOME
      routeId: $routeId
      fromDate: $fromDate
      toDate: $toDate
      limit: 500
    ) {
      edges {
        node {
          id
          amount
          date
          type
          incomeSource
          profitAmount
          returnToCapital
          loan {
            id
            borrower {
              id
              personalData {
                id
                fullName
              }
            }
          }
          loanPayment {
            id
            amount
            comission
            paymentMethod
          }
          sourceAccount {
            id
            name
            type
          }
          route {
            id
            name
          }
          lead {
            id
            personalData {
              id
              fullName
            }
            location {
              id
              name
            }
          }
          createdAt
        }
      }
      totalCount
    }
  }
`

// Query to get all transaction types for full summary
export const ALL_TRANSACTIONS_BY_DATE_QUERY = gql`
  query AllTransactionsByDate($fromDate: DateTime!, $toDate: DateTime!, $routeId: ID!) {
    transactions(
      routeId: $routeId
      fromDate: $fromDate
      toDate: $toDate
      limit: 500
    ) {
      edges {
        node {
          id
          amount
          date
          type
          incomeSource
          expenseSource
          profitAmount
          returnToCapital
          loan {
            id
            amountGived
            borrower {
              id
              personalData {
                id
                fullName
              }
            }
          }
          loanPayment {
            id
            amount
            comission
            paymentMethod
          }
          sourceAccount {
            id
            name
            type
          }
          route {
            id
            name
          }
          lead {
            id
            personalData {
              id
              fullName
            }
            location {
              id
              name
            }
          }
          createdAt
        }
      }
      totalCount
    }
  }
`

// ============================================================
// SEARCH QUERIES - Para Autocomplete en Creditos
// ============================================================

export const SEARCH_BORROWERS_QUERY = gql`
  query SearchBorrowers($searchTerm: String!, $leadId: ID, $locationId: ID, $limit: Int) {
    searchBorrowers(searchTerm: $searchTerm, leadId: $leadId, locationId: $locationId, limit: $limit) {
      id
      personalData {
        id
        fullName
        clientCode
        phones {
          id
          number
        }
        addresses {
          id
          location {
            id
            name
          }
        }
      }
      loanFinishedCount
      hasActiveLoans
      pendingDebtAmount
      locationId
      locationName
      isFromCurrentLocation
    }
  }
`

export const SEARCH_PERSONAL_DATA_QUERY = gql`
  query SearchPersonalData($searchTerm: String!, $excludeBorrowerId: ID, $locationId: ID, $limit: Int) {
    searchPersonalData(searchTerm: $searchTerm, excludeBorrowerId: $excludeBorrowerId, locationId: $locationId, limit: $limit) {
      id
      fullName
      clientCode
      phones {
        id
        number
      }
      addresses {
        id
        location {
          id
          name
        }
      }
    }
  }
`

// Query para obtener prestamos activos para renovacion
// Filtra por leadId para obtener solo los prestamos de la localidad seleccionada
export const ACTIVE_LOANS_FOR_RENEWAL_QUERY = gql`
  query ActiveLoansForRenewal($leadId: ID) {
    loans(leadId: $leadId, limit: 500) {
      totalCount
      edges {
        node {
          id
          requestedAmount
          amountGived
          profitAmount
          signDate
          pendingAmountStored
          expectedWeeklyPayment
          totalPaid
          status
          renewedBy {
            id
          }
          loantype {
            id
            name
            rate
            weekDuration
          }
          borrower {
            id
            loanFinishedCount
            personalData {
              id
              fullName
              clientCode
              phones {
                id
                number
              }
              addresses {
                id
                location {
                  id
                  name
                }
              }
            }
          }
          collaterals {
            id
            fullName
            phones {
              id
              number
            }
            addresses {
              id
              location {
                id
                name
              }
            }
          }
          lead {
            id
            personalData {
              id
              addresses {
                id
                location {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`

// ============================================================
// FALCOS PENDIENTES - Para Modal de Compensación
// ============================================================

export const FALCOS_PENDIENTES_QUERY = gql`
  query FalcosPendientes($routeId: ID, $leadId: ID) {
    falcosPendientes(routeId: $routeId, leadId: $leadId) {
      id
      falcoAmount
      createdAt
      lead {
        id
        personalData {
          id
          fullName
        }
      }
      falcoCompensatoryPayments {
        id
        amount
        createdAt
      }
    }
  }
`

// ============================================================
// TRANSACTION SUMMARY - Summary Tab (server-side calculations)
// ============================================================

export const TRANSACTIONS_SUMMARY_BY_LOCATION_QUERY = gql`
  query TransactionsSummaryByLocation($routeId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
    transactionsSummaryByLocation(routeId: $routeId, startDate: $startDate, endDate: $endDate) {
      localities {
        locationKey
        localityName
        leaderName
        leaderId
        payments {
          id
          borrowerName
          amount
          commission
          paymentMethod
          date
        }
        totalPayments
        cashPayments
        bankPayments
        bankPaymentsFromClients
        leaderCashToBank
        paymentCount
        totalPaymentCommissions
        totalLoansGrantedCommissions
        totalCommissions
        expenses {
          id
          source
          sourceLabel
          amount
          date
        }
        totalExpenses
        loansGranted {
          id
          borrowerName
          amount
          date
        }
        totalLoansGranted
        loansGrantedCount
        balanceEfectivo
        balanceBanco
        balance
      }
      executiveSummary {
        totalPaymentsReceived
        totalCashPayments
        totalBankPayments
        totalPaymentCommissions
        totalLoansGrantedCommissions
        totalCommissions
        totalExpenses
        totalLoansGranted
        paymentCount
        expenseCount
        loansGrantedCount
        netBalance
      }
    }
  }
`
