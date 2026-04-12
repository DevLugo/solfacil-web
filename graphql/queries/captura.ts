import { gql } from '@apollo/client'

// Fragment for full CapturaResult JSON fields (used by job status polling and DB record queries)
const CAPTURA_RESULT_FIELDS = `
  sessionId
  fecha
  fechaPdf
  fechaWarning
  routeCode
  routeId
  processingTimeSeconds
  usage {
    claudeInputTokens
    claudeOutputTokens
    claudeCalls
    claudeCostUsd
    googleOcrCalls
    googleCostUsd
    totalCostUsd
  }
  gastos {
    concepto
    monto
    expenseSource
    description
    sourceAccountType
  }
  localities {
    localidad
    leadId
    locationId
    fecha
    totalClientes
    yaCaptured
    confidence
    errores
    duracionSegundos
    resumenInferior {
      cobranzaBase
      adelantosCreditos {
        nombre
        monto
      }
      recuperados {
        nombre
        codigo
        monto
      }
      cobranzaTotal
      tarifaComision
      comisionRegular {
        clientes
        tarifa
        total
      }
      comisionCreditos {
        clientes
        tarifa
        total
        cantidad
      }
      comisionTotal
      cashToBank
      inicialCaja
    }
    excepciones {
      pos
      marca
      montoPagado
      paymentMethod
      notas
      clientCode
      loanId
      borrowerId
      montoImpreso
      matchConfidence
    }
    creditos {
      nombre
      clientCode
      tipo
      monto
      entregado
      semanas
      porcentaje
      loantypeId
      aval
      loanIdAnterior
      telefonoTitular
      matchedClientPos
      matchConfidence
      comisionCredito
      primerPago
      primerPagoMonto
      primerPagoComision
    }
    validacion {
      totalFilas
      marcasEnTabla
      marcasAlgoritmo
    }
    clientsList {
      pos
      clientCode
      loanId
      borrowerId
      borrowerName
      expectedWeeklyPayment
      loanPaymentComission
      requestedAmount
      totalPaid
      pendingBalance
      totalDebtAcquired
      loantypeId
      loantypeName
      weekDuration
      rate
      loanGrantedComission
      collateralName
      collateralPhone
      borrowerPhone
    }
  }
  loantypes {
    id
    name
    weekDuration
    rate
    loanPaymentComission
    loanGrantedComission
  }
`

export const CAPTURA_JOB_STATUS_QUERY = gql`
  query CapturaJobStatus($jobId: String!) {
    capturaJobStatus(jobId: $jobId) {
      status
      error
      progress
      queuePosition
      queueTotal
      result {
        ${CAPTURA_RESULT_FIELDS}
      }
    }
  }
`

export const CAPTURA_JOB_QUERY = gql`
  query CapturaJob($id: ID!) {
    capturaJob(id: $id) {
      id
      status
      routeId
      routeCode
      date
      fileName
      pdfUrl
      result
      editedResult
      processingTimeSeconds
      costUsd
      confirmedAt
      createdAt
      updatedAt
    }
  }
`

export const CAPTURA_JOBS_BY_ROUTE_QUERY = gql`
  query CapturaJobsByRoute($routeId: ID!, $month: Int!, $year: Int!) {
    capturaJobsByRoute(routeId: $routeId, month: $month, year: $year) {
      weekStart
      weekLabel
      days {
        date
        dayLabel
        jobs {
          id
          status
          routeId
          routeCode
          date
          fileName
          localityCount
          processingTimeSeconds
          costUsd
          confirmedAt
          createdAt
        }
      }
    }
  }
`

export const CAPTURA_JOBS_BY_DATE_QUERY = gql`
  query CapturaJobsByDate($date: String!) {
    capturaJobsByDate(date: $date) {
      id
      status
      routeId
      routeCode
      date
      fileName
      localityCount
      processingTimeSeconds
      costUsd
      confirmedAt
      createdAt
    }
  }
`

export const CAPTURA_JOBS_BY_WEEK_QUERY = gql`
  query CapturaJobsByWeek($weekStart: String!) {
    capturaJobsByWeek(weekStart: $weekStart) {
      id
      status
      routeId
      routeCode
      date
      fileName
      localityCount
      processingTimeSeconds
      costUsd
      confirmedAt
      createdAt
    }
  }
`

export const FINANCIAL_ACTIVITY_BY_WEEK_QUERY = gql`
  query FinancialActivityByWeek($routeIds: [ID!]!, $weekStart: String!) {
    financialActivityByWeek(routeIds: $routeIds, weekStart: $weekStart) {
      routeId
      date
      paymentCount
      loanCount
    }
  }
`

export const CAPTURA_ROUTE_LEADS_QUERY = gql`
  query CapturaRouteLeads($routeId: ID!) {
    employees(routeId: $routeId, type: LEAD) {
      id
      personalData {
        id
        fullName
        clientCode
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
`

export const CAPTURA_LEAD_LOANS_QUERY = gql`
  query CapturaLeadLoans($leadId: ID!) {
    loans(leadId: $leadId, status: ACTIVE, excludePortfolioCleanup: true, limit: 500) {
      edges {
        node {
          id
          requestedAmount
          amountGived
          signDate
          expectedWeeklyPayment
          totalPaid
          comissionAmount
          calculatedPendingAmount
          pendingAmountStored
          status
          loantype {
            id
            name
            weekDuration
            rate
            loanPaymentComission
            loanGrantedComission
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
              clientCode
              phones {
                number
              }
            }
          }
        }
      }
      totalCount
    }
  }
`
