import { gql } from '@apollo/client'

export const GET_FINANCIAL_REPORT_ANNUAL = gql`
  query GetFinancialReportAnnual($routeIds: [ID!]!, $year: Int!) {
    getFinancialReportAnnual(routeIds: $routeIds, year: $year) {
      routes {
        id
        name
      }
      year
      months
      data {
        month
        totalExpenses
        generalExpenses
        nomina
        comissions
        nominaInterna
        salarioExterno
        viaticos
        travelExpenses
        tokaGasolina
        cashGasolina
        totalGasolina
        badDebtAmount
        incomes
        operationalProfit
        profitPercentage
        gainPerPayment
        activeWeeks
        weeklyAverageProfit
        weeklyAverageExpenses
        weeklyAverageIncome
        loanDisbursements
        carteraActiva
        carteraVencida
        carteraMuerta
        renovados
        totalIncomingCash
        capitalReturn
        profitReturn
        operationalCashUsed
        totalInvestment
        availableCash
        paymentsCount
      }
      annualWeeklyAverageProfit
      annualWeeklyAverageExpenses
      annualWeeklyAverageIncome
      totalActiveWeeks
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
