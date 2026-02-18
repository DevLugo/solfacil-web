import { gql } from '@apollo/client'

export const CONFIRM_OCR_BATCH = gql`
  mutation ConfirmOCRBatch($input: ConfirmOCRBatchInput!) {
    confirmOCRBatch(input: $input) {
      paymentsCreated
      loansCreated
      expensesCreated
    }
  }
`

export const PROCESS_OCR_DOCUMENT = gql`
  mutation ProcessOCRDocument($routeId: ID!, $businessDate: DateTime!, $file: Upload!, $skipCache: Boolean, $testMode: Boolean) {
    processOCRDocument(routeId: $routeId, businessDate: $businessDate, file: $file, skipCache: $skipCache, testMode: $testMode) {
      pagesProcessed
      overallConfidence
      rawJsonPages

      payments {
        localityName
        leaderName
        resolvedLeaderId
        resolvedLeaderConfidence
        fecha
        cobranzaTotal
        comisionTotal
        cashTotal
        bankTotal
        falcoAmount

        clientPayments {
          clientId
          clientName
          abonoEsperado
          abonoReal
          paid
          paymentMethod
          comission
          notes
          resolvedLoanId
          resolvedBorrowerId
          matchConfidence
          matchMethod
          dbClientCode
          dbClientName
          dbPendingAmount
          dbExpectedPayment
          amountWarning
        }

        warnings {
          code
          message
          field
          pageIndex
        }
      }

      loans {
        numero
        clientName
        creditAmount
        deliveredAmount
        termWeeks
        creditType
        resolvedBorrowerId
        resolvedPreviousLoanId
        resolvedLoantypeId
        matchConfidence
        estimatedRate
        estimatedProfit
        estimatedTotalDebt
        isNewClient
        isRenewal
        previousLoanPending
        expectedDeliveredAmount
        localityName
        avalName
        avalAddress
        titularAddress
        titularPhone
        avalPhone
        warnings {
          code
          message
          field
        }
      }

      expenses {
        expenseType
        establishment
        amount
        date
        paymentMethod
        notes
        resolvedSourceType
        resolvedAccountId
        confidence
      }

      crossValidation {
        isValid
        registroDiarioTotal
        listadosTotal
        difference
        cashCountTotal
        expectedCashTotal
        cashDifference
        inicialEfectivo
        finalEfectivo
        fichaDeposito
        totalColocado
        totalCuota
        totalGastos
        extracobranza

        groupValidations {
          groupNumber
          localityName
          rdColocacion
          rdCuota
          rdCobranza
          lcCobranzaTotal
          lcComisionTotal
          acColocacionTotal
          cobranzaMatch
          cobranzaDifference
          colocacionMatch
          colocacionDifference
          cuotaMatch
          cuotaDifference
          warnings {
            code
            message
          }
        }
      }

      warnings {
        code
        message
        field
        pageIndex
      }

      errors {
        code
        message
        field
        pageIndex
      }
    }
  }
`
