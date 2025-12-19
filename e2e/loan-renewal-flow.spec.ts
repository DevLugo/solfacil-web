import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Loan Renewal Flow with Payment Validation
 *
 * These tests validate the complete loan lifecycle:
 * 1. Create a new loan
 * 2. Make payments (individual or bulk)
 * 3. Renew the loan
 * 4. Verify profit inheritance (profitHeredado) is calculated correctly
 *
 * Key business rules tested:
 * - profitHeredado = pendingAmountStored × (profitAmount / totalDebtAcquired)
 * - Each payment distributes proportionally between profit and returnToCapital
 * - Bulk payments should calculate the same total as individual payments
 */

// Test user credentials
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'elugo.isi@gmail.com',
  password: process.env.TEST_USER_PASSWORD || 'test1234',
}

// GraphQL endpoint
const GRAPHQL_URL = 'http://localhost:4000/graphql'

// ============================================================================
// TYPES
// ============================================================================

interface LoanData {
  id: string
  requestedAmount: string
  amountGived: string
  profitAmount: string
  totalDebtAcquired: string
  pendingAmountStored: string
  expectedWeeklyPayment: string
  status: string
}

interface PaymentData {
  id: string
  amount: string
  profitAmount?: string
  returnToCapital?: string
}

interface LoanTypeData {
  id: string
  name: string
  rate: string
  weekDuration: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Login to the application - with storageState support
 */
async function login(page: Page) {
  // Try to go directly to dashboard (will work if storageState is valid)
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  // Check if we're already logged in (storageState worked)
  const currentUrl = page.url()
  if (currentUrl.includes('/dashboard') || currentUrl.includes('/transacciones')) {
    return // Already logged in via storageState
  }

  // Not logged in, perform manual login
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.locator('input#email').fill(TEST_USER.email)
  await page.locator('input#password').fill(TEST_USER.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()

  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 15000 })
}

/**
 * Make a GraphQL call from within the browser context
 */
async function makeGraphQLCall(page: Page, query: string, variables: Record<string, unknown>) {
  return page.evaluate(
    async ({ url, query, variables }) => {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ query, variables }),
      })
      return response.json()
    },
    { url: GRAPHQL_URL, query, variables }
  )
}

/**
 * Get test data needed for creating loans
 */
async function getTestData(page: Page) {
  const query = `
    query GetTestData {
      loantypes {
        id
        name
        rate
        weekDuration
      }
      employees(type: LEAD) {
        id
        personalData {
          fullName
        }
      }
      routes {
        id
        name
      }
      accounts {
        id
        name
        type
      }
    }
  `
  const result = await makeGraphQLCall(page, query, {})
  return {
    loantypes: result.data?.loantypes || [],
    employees: result.data?.employees || [],
    routes: result.data?.routes || [],
    accounts: result.data?.accounts || [],
  }
}

/**
 * Search for a borrower or create one for testing
 */
async function getOrCreateBorrower(page: Page, leadId: string): Promise<string> {
  // First, search for existing borrowers
  const searchQuery = `
    query SearchBorrowers($searchTerm: String!, $leadId: ID) {
      searchBorrowers(searchTerm: $searchTerm, leadId: $leadId, limit: 10) {
        id
        personalData {
          fullName
        }
        hasActiveLoans
      }
    }
  `
  const searchResult = await makeGraphQLCall(page, searchQuery, { searchTerm: 'test', leadId })

  if (searchResult.errors) {
    console.log('Search borrowers error:', JSON.stringify(searchResult.errors))
  }

  const borrowers = searchResult.data?.searchBorrowers || []

  // Look for a borrower without active loan
  const availableBorrower = borrowers.find((b: { hasActiveLoans: boolean }) => !b.hasActiveLoans)
  if (availableBorrower) {
    console.log(`Found existing borrower without active loan: ${availableBorrower.id}`)
    return availableBorrower.id
  }

  // If all borrowers have active loans, create a new one
  const createMutation = `
    mutation CreateBorrower($input: CreateBorrowerInput!) {
      createBorrower(input: $input) {
        id
        personalData {
          fullName
        }
      }
    }
  `
  const timestamp = Date.now()
  const createResult = await makeGraphQLCall(page, createMutation, {
    input: {
      personalData: {
        fullName: `Test Borrower ${timestamp}`,
        phones: [{ number: `555${timestamp.toString().slice(-7)}` }],
      },
    },
  })

  if (createResult.errors) {
    console.log('Create borrower error:', JSON.stringify(createResult.errors))
    throw new Error(`Failed to create borrower: ${JSON.stringify(createResult.errors)}`)
  }

  console.log(`Created new borrower: ${createResult.data?.createBorrower?.id}`)
  return createResult.data?.createBorrower?.id
}

/**
 * Create a new loan via GraphQL
 */
async function createLoan(
  page: Page,
  borrowerId: string,
  loantypeId: string,
  grantorId: string,
  leadId: string,
  requestedAmount: number,
  amountGived?: number,
  previousLoanId?: string
): Promise<LoanData> {
  const mutation = `
    mutation CreateLoan($input: CreateLoanInput!) {
      createLoan(input: $input) {
        id
        requestedAmount
        amountGived
        profitAmount
        totalDebtAcquired
        pendingAmountStored
        expectedWeeklyPayment
        status
        previousLoan {
          id
          status
        }
      }
    }
  `

  const input: Record<string, unknown> = {
    requestedAmount: requestedAmount.toString(),
    amountGived: (amountGived ?? requestedAmount).toString(),
    signDate: new Date().toISOString(),
    borrowerId,
    loantypeId,
    grantorId,
    leadId,
  }

  if (previousLoanId) {
    input.previousLoanId = previousLoanId
  }

  const result = await makeGraphQLCall(page, mutation, { input })

  if (result.errors) {
    throw new Error(`Failed to create loan: ${JSON.stringify(result.errors)}`)
  }

  return result.data.createLoan
}

/**
 * Renew a loan via GraphQL
 */
async function renewLoan(
  page: Page,
  loanId: string,
  loantypeId: string,
  requestedAmount: number,
  amountGived: number
): Promise<LoanData> {
  const mutation = `
    mutation RenewLoan($loanId: ID!, $input: RenewLoanInput!) {
      renewLoan(loanId: $loanId, input: $input) {
        id
        requestedAmount
        amountGived
        profitAmount
        totalDebtAcquired
        pendingAmountStored
        expectedWeeklyPayment
        status
        previousLoan {
          id
          status
          pendingAmountStored
          profitAmount
          totalDebtAcquired
        }
      }
    }
  `

  const input = {
    requestedAmount: requestedAmount.toString(),
    amountGived: amountGived.toString(),
    signDate: new Date().toISOString(),
    loantypeId,
  }

  const result = await makeGraphQLCall(page, mutation, { loanId, input })

  if (result.errors) {
    throw new Error(`Failed to renew loan: ${JSON.stringify(result.errors)}`)
  }

  return result.data.renewLoan
}

/**
 * Create a loan payment via GraphQL
 */
async function createPayment(
  page: Page,
  loanId: string,
  amount: number,
  receivedAt?: Date
): Promise<PaymentData> {
  const mutation = `
    mutation CreateLoanPayment($input: CreateLoanPaymentInput!) {
      createLoanPayment(input: $input) {
        id
        amount
        loan {
          id
          pendingAmountStored
          profitAmount
          totalDebtAcquired
        }
      }
    }
  `

  const input = {
    loanId,
    amount: amount.toString(),
    receivedAt: (receivedAt || new Date()).toISOString(),
    paymentMethod: 'CASH',
  }

  const result = await makeGraphQLCall(page, mutation, { input })

  if (result.errors) {
    throw new Error(`Failed to create payment: ${JSON.stringify(result.errors)}`)
  }

  return result.data.createLoanPayment
}

/**
 * Get current loan state
 */
async function getLoan(page: Page, loanId: string): Promise<LoanData> {
  const query = `
    query GetLoan($id: ID!) {
      loan(id: $id) {
        id
        requestedAmount
        amountGived
        profitAmount
        totalDebtAcquired
        pendingAmountStored
        expectedWeeklyPayment
        status
        totalPaid
        payments {
          id
          amount
        }
      }
    }
  `

  const result = await makeGraphQLCall(page, query, { id: loanId })

  if (result.errors) {
    throw new Error(`Failed to get loan: ${JSON.stringify(result.errors)}`)
  }

  return result.data.loan
}

/**
 * Helper to round to 2 decimal places
 */
function round2(num: number): number {
  return Math.round(num * 100) / 100
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('Loan Renewal Flow - Profit Inheritance Validation', () => {
  // Store test data for reuse
  let testLoantype: LoanTypeData
  let testLeadId: string
  let testGrantorId: string

  test.beforeEach(async ({ page }) => {
    await login(page)

    // Get test data once
    const testData = await getTestData(page)

    // Find a loan type with ~40% rate and 14 weeks (or any available)
    testLoantype = testData.loantypes.find(
      (lt: LoanTypeData) => parseFloat(lt.rate) >= 0.35 && lt.weekDuration >= 10
    ) || testData.loantypes[0]

    // Get a lead and grantor (same employee can be both for testing)
    testLeadId = testData.employees[0]?.id
    testGrantorId = testData.employees[0]?.id

    if (!testLoantype || !testLeadId) {
      throw new Error('Test data not available: missing loantype or employees')
    }
  })

  // ==========================================================================
  // SCENARIO 1: Individual Payments (10 weekly payments)
  // ==========================================================================

  test('should correctly calculate profitHeredado after 10 individual payments and renewal', async ({
    page,
  }) => {
    // Step 1: Get or create a borrower
    const borrowerId = await getOrCreateBorrower(page, testLeadId)
    expect(borrowerId).toBeTruthy()

    // Step 2: Create initial loan
    const requestedAmount = 3000
    const rate = parseFloat(testLoantype.rate)
    const weekDuration = testLoantype.weekDuration

    const initialLoan = await createLoan(
      page,
      borrowerId,
      testLoantype.id,
      testGrantorId,
      testLeadId,
      requestedAmount
    )

    // Verify initial loan calculations
    const profitAmount = round2(requestedAmount * rate)
    const totalDebtAcquired = requestedAmount + profitAmount
    const expectedWeeklyPayment = round2(totalDebtAcquired / weekDuration)
    const profitRatio = profitAmount / totalDebtAcquired

    expect(parseFloat(initialLoan.profitAmount)).toBeCloseTo(profitAmount, 0)
    expect(parseFloat(initialLoan.totalDebtAcquired)).toBeCloseTo(totalDebtAcquired, 0)
    expect(parseFloat(initialLoan.expectedWeeklyPayment)).toBeCloseTo(expectedWeeklyPayment, 0)

    console.log(`Initial Loan Created:
      - ID: ${initialLoan.id}
      - Requested: $${requestedAmount}
      - Profit: $${initialLoan.profitAmount}
      - Total Debt: $${initialLoan.totalDebtAcquired}
      - Weekly Payment: $${initialLoan.expectedWeeklyPayment}
      - Profit Ratio: ${round2(profitRatio * 100)}%
    `)

    // Step 3: Make 10 individual payments
    const paymentAmount = parseFloat(initialLoan.expectedWeeklyPayment)
    const numberOfPayments = 10
    const baseDate = new Date()

    for (let i = 0; i < numberOfPayments; i++) {
      const paymentDate = new Date(baseDate)
      paymentDate.setDate(paymentDate.getDate() + i * 7) // Simulate weekly payments

      await createPayment(page, initialLoan.id, paymentAmount, paymentDate)
    }

    // Step 4: Get updated loan state after payments
    const loanAfterPayments = await getLoan(page, initialLoan.id)

    // Calculate expected values after 10 payments
    const totalPaid = paymentAmount * numberOfPayments
    const expectedPendingAfterPayments = round2(totalDebtAcquired - totalPaid)

    expect(parseFloat(loanAfterPayments.pendingAmountStored)).toBeCloseTo(
      expectedPendingAfterPayments,
      0
    )

    console.log(`After ${numberOfPayments} payments:
      - Total Paid: $${totalPaid}
      - Pending Amount: $${loanAfterPayments.pendingAmountStored}
    `)

    // Step 5: Calculate expected profitHeredado for renewal
    const pendingAmountStored = parseFloat(loanAfterPayments.pendingAmountStored)
    const expectedProfitHeredado = round2(pendingAmountStored * profitRatio)

    console.log(`Expected Profit Heredado: $${expectedProfitHeredado}
      - Formula: pendingAmountStored × profitRatio
      - = $${pendingAmountStored} × ${round2(profitRatio * 100)}%
    `)

    // Step 6: Renew the loan
    const amountGived = requestedAmount - pendingAmountStored
    const renewedLoan = await renewLoan(
      page,
      initialLoan.id,
      testLoantype.id,
      requestedAmount,
      Math.max(0, amountGived)
    )

    // Step 7: Verify renewal calculations
    // profitAmount in renewed loan = profitBase + profitHeredado
    const profitBase = round2(requestedAmount * rate)
    const expectedNewProfitAmount = round2(profitBase + expectedProfitHeredado)
    const expectedNewTotalDebt = round2(requestedAmount + expectedNewProfitAmount)

    console.log(`Renewed Loan:
      - ID: ${renewedLoan.id}
      - Profit Base: $${profitBase}
      - Profit Heredado (expected): $${expectedProfitHeredado}
      - New Profit Amount: $${renewedLoan.profitAmount}
      - Expected New Profit: $${expectedNewProfitAmount}
      - New Total Debt: $${renewedLoan.totalDebtAcquired}
      - Expected New Total Debt: $${expectedNewTotalDebt}
    `)

    // The critical assertion: profitHeredado should be proportional to pending debt
    // NOT equal to the full pending debt
    expect(parseFloat(renewedLoan.profitAmount)).toBeCloseTo(expectedNewProfitAmount, 0)
    expect(parseFloat(renewedLoan.totalDebtAcquired)).toBeCloseTo(expectedNewTotalDebt, 0)

    // Verify that profitHeredado is NOT equal to pendingAmountStored (regression test)
    const actualNewProfit = parseFloat(renewedLoan.profitAmount)
    const incorrectProfit = profitBase + pendingAmountStored // This would be the BUG

    if (pendingAmountStored > 0) {
      expect(actualNewProfit).not.toBeCloseTo(incorrectProfit, 0)
    }

    console.log(`\n✅ VERIFICATION PASSED:
      - profitHeredado is correctly calculated as: $${expectedProfitHeredado}
      - NOT incorrectly using raw pendingAmountStored: $${pendingAmountStored}
    `)
  })

  // ==========================================================================
  // SCENARIO 2: Bulk Payment (equivalent to 10 payments)
  // ==========================================================================

  test('should correctly calculate profitHeredado after 1 bulk payment equivalent to 10 payments', async ({
    page,
  }) => {
    // Step 1: Get or create a borrower (different from previous test)
    const borrowerId = await getOrCreateBorrower(page, testLeadId)
    expect(borrowerId).toBeTruthy()

    // Step 2: Create initial loan with same parameters
    const requestedAmount = 3000
    const rate = parseFloat(testLoantype.rate)
    const weekDuration = testLoantype.weekDuration

    const initialLoan = await createLoan(
      page,
      borrowerId,
      testLoantype.id,
      testGrantorId,
      testLeadId,
      requestedAmount
    )

    const profitAmount = parseFloat(initialLoan.profitAmount)
    const totalDebtAcquired = parseFloat(initialLoan.totalDebtAcquired)
    const expectedWeeklyPayment = parseFloat(initialLoan.expectedWeeklyPayment)
    const profitRatio = profitAmount / totalDebtAcquired

    console.log(`Initial Loan Created (Bulk Payment Scenario):
      - ID: ${initialLoan.id}
      - Requested: $${requestedAmount}
      - Profit: $${profitAmount}
      - Total Debt: $${totalDebtAcquired}
      - Weekly Payment: $${expectedWeeklyPayment}
    `)

    // Step 3: Make ONE bulk payment equivalent to 10 weekly payments
    const numberOfPaymentsEquivalent = 10
    const bulkPaymentAmount = round2(expectedWeeklyPayment * numberOfPaymentsEquivalent)

    await createPayment(page, initialLoan.id, bulkPaymentAmount)

    // Step 4: Get updated loan state
    const loanAfterBulkPayment = await getLoan(page, initialLoan.id)

    const expectedPendingAfterBulk = round2(totalDebtAcquired - bulkPaymentAmount)

    console.log(`After bulk payment of $${bulkPaymentAmount}:
      - Pending Amount: $${loanAfterBulkPayment.pendingAmountStored}
      - Expected Pending: $${expectedPendingAfterBulk}
    `)

    expect(parseFloat(loanAfterBulkPayment.pendingAmountStored)).toBeCloseTo(
      expectedPendingAfterBulk,
      0
    )

    // Step 5: Calculate expected profitHeredado
    const pendingAmountStored = parseFloat(loanAfterBulkPayment.pendingAmountStored)
    const expectedProfitHeredado = round2(pendingAmountStored * profitRatio)

    // Step 6: Renew the loan
    const amountGived = requestedAmount - pendingAmountStored
    const renewedLoan = await renewLoan(
      page,
      initialLoan.id,
      testLoantype.id,
      requestedAmount,
      Math.max(0, amountGived)
    )

    // Step 7: Verify renewal calculations
    const profitBase = round2(requestedAmount * rate)
    const expectedNewProfitAmount = round2(profitBase + expectedProfitHeredado)

    console.log(`Renewed Loan (after bulk payment):
      - Profit Base: $${profitBase}
      - Profit Heredado (expected): $${expectedProfitHeredado}
      - New Profit Amount: $${renewedLoan.profitAmount}
      - Expected New Profit: $${expectedNewProfitAmount}
    `)

    expect(parseFloat(renewedLoan.profitAmount)).toBeCloseTo(expectedNewProfitAmount, 0)

    console.log(`\n✅ BULK PAYMENT VERIFICATION PASSED`)
  })

  // ==========================================================================
  // SCENARIO 3: Compare Individual vs Bulk Payments
  // ==========================================================================

  test('should produce same profitHeredado for individual payments vs equivalent bulk payment', async ({
    page,
  }) => {
    const requestedAmount = 3000
    const rate = parseFloat(testLoantype.rate)
    const numberOfPayments = 10

    // ========== LOAN A: Individual Payments ==========
    const borrowerA = await getOrCreateBorrower(page, testLeadId)
    const loanA = await createLoan(
      page,
      borrowerA,
      testLoantype.id,
      testGrantorId,
      testLeadId,
      requestedAmount
    )

    const weeklyPayment = parseFloat(loanA.expectedWeeklyPayment)
    const profitRatio =
      parseFloat(loanA.profitAmount) / parseFloat(loanA.totalDebtAcquired)

    // Make 10 individual payments
    for (let i = 0; i < numberOfPayments; i++) {
      const paymentDate = new Date()
      paymentDate.setDate(paymentDate.getDate() + i * 7)
      await createPayment(page, loanA.id, weeklyPayment, paymentDate)
    }

    const loanAAfterPayments = await getLoan(page, loanA.id)
    const pendingA = parseFloat(loanAAfterPayments.pendingAmountStored)
    const profitHeredadoA = round2(pendingA * profitRatio)

    // ========== LOAN B: Bulk Payment ==========
    const borrowerB = await getOrCreateBorrower(page, testLeadId)
    const loanB = await createLoan(
      page,
      borrowerB,
      testLoantype.id,
      testGrantorId,
      testLeadId,
      requestedAmount
    )

    const bulkAmount = round2(weeklyPayment * numberOfPayments)

    // Make ONE bulk payment
    await createPayment(page, loanB.id, bulkAmount)

    const loanBAfterPayment = await getLoan(page, loanB.id)
    const pendingB = parseFloat(loanBAfterPayment.pendingAmountStored)
    const profitHeredadoB = round2(pendingB * profitRatio)

    // ========== Compare Results ==========
    console.log(`
    Comparison: Individual vs Bulk Payments
    =======================================
    LOAN A (${numberOfPayments} individual payments of $${weeklyPayment}):
      - Total Paid: $${round2(weeklyPayment * numberOfPayments)}
      - Pending: $${pendingA}
      - Profit Heredado: $${profitHeredadoA}

    LOAN B (1 bulk payment of $${bulkAmount}):
      - Total Paid: $${bulkAmount}
      - Pending: $${pendingB}
      - Profit Heredado: $${profitHeredadoB}
    `)

    // Both should have the same pending amount (within rounding tolerance)
    expect(pendingA).toBeCloseTo(pendingB, 0)

    // Both should have the same profitHeredado
    expect(profitHeredadoA).toBeCloseTo(profitHeredadoB, 0)

    console.log(`\n✅ INDIVIDUAL vs BULK PAYMENTS ARE EQUIVALENT`)
  })

  // ==========================================================================
  // SCENARIO 4: Full Flow - Create, Pay, Renew, Pay, Renew Again
  // ==========================================================================

  test('should correctly handle double renewal with payments', async ({ page }) => {
    const requestedAmount = 3000
    const rate = parseFloat(testLoantype.rate)
    const numberOfPayments = 10

    // ========== PHASE 1: Create Initial Loan ==========
    const borrowerId = await getOrCreateBorrower(page, testLeadId)
    const loan1 = await createLoan(
      page,
      borrowerId,
      testLoantype.id,
      testGrantorId,
      testLeadId,
      requestedAmount
    )

    const weeklyPayment = parseFloat(loan1.expectedWeeklyPayment)
    const totalDebt1 = parseFloat(loan1.totalDebtAcquired)
    const profit1 = parseFloat(loan1.profitAmount)
    const profitRatio1 = profit1 / totalDebt1

    console.log(`
    ======== PHASE 1: Initial Loan ========
    Loan ID: ${loan1.id}
    Requested: $${requestedAmount}
    Profit: $${profit1}
    Total Debt: $${totalDebt1}
    Weekly Payment: $${weeklyPayment}
    Profit Ratio: ${round2(profitRatio1 * 100)}%
    `)

    // ========== PHASE 2: Make 10 Payments ==========
    for (let i = 0; i < numberOfPayments; i++) {
      await createPayment(page, loan1.id, weeklyPayment)
    }

    const loan1AfterPayments = await getLoan(page, loan1.id)
    const pending1 = parseFloat(loan1AfterPayments.pendingAmountStored)
    const profitHeredado1 = round2(pending1 * profitRatio1)

    console.log(`
    ======== PHASE 2: After ${numberOfPayments} Payments ========
    Total Paid: $${round2(weeklyPayment * numberOfPayments)}
    Pending: $${pending1}
    Profit Heredado for Renewal: $${profitHeredado1}
    `)

    // ========== PHASE 3: First Renewal ==========
    const amountGived1 = Math.max(0, requestedAmount - pending1)
    const loan2 = await renewLoan(
      page,
      loan1.id,
      testLoantype.id,
      requestedAmount,
      amountGived1
    )

    const profit2 = parseFloat(loan2.profitAmount)
    const totalDebt2 = parseFloat(loan2.totalDebtAcquired)
    const profitRatio2 = profit2 / totalDebt2

    const expectedProfit2 = round2(requestedAmount * rate + profitHeredado1)

    console.log(`
    ======== PHASE 3: First Renewal ========
    New Loan ID: ${loan2.id}
    Amount Given: $${amountGived1}
    Profit Base: $${round2(requestedAmount * rate)}
    Profit Heredado: $${profitHeredado1}
    New Profit (expected): $${expectedProfit2}
    New Profit (actual): $${profit2}
    New Total Debt: $${totalDebt2}
    New Profit Ratio: ${round2(profitRatio2 * 100)}%
    `)

    expect(profit2).toBeCloseTo(expectedProfit2, 0)

    // ========== PHASE 4: Make 10 More Payments ==========
    const weeklyPayment2 = parseFloat(loan2.expectedWeeklyPayment)

    for (let i = 0; i < numberOfPayments; i++) {
      await createPayment(page, loan2.id, weeklyPayment2)
    }

    const loan2AfterPayments = await getLoan(page, loan2.id)
    const pending2 = parseFloat(loan2AfterPayments.pendingAmountStored)
    const profitHeredado2 = round2(pending2 * profitRatio2)

    console.log(`
    ======== PHASE 4: After ${numberOfPayments} More Payments ========
    Weekly Payment: $${weeklyPayment2}
    Total Paid: $${round2(weeklyPayment2 * numberOfPayments)}
    Pending: $${pending2}
    Profit Heredado for Second Renewal: $${profitHeredado2}
    `)

    // ========== PHASE 5: Second Renewal ==========
    const amountGived2 = Math.max(0, requestedAmount - pending2)
    const loan3 = await renewLoan(
      page,
      loan2.id,
      testLoantype.id,
      requestedAmount,
      amountGived2
    )

    const profit3 = parseFloat(loan3.profitAmount)
    const expectedProfit3 = round2(requestedAmount * rate + profitHeredado2)

    console.log(`
    ======== PHASE 5: Second Renewal ========
    New Loan ID: ${loan3.id}
    Amount Given: $${amountGived2}
    Profit Base: $${round2(requestedAmount * rate)}
    Profit Heredado: $${profitHeredado2}
    New Profit (expected): $${expectedProfit3}
    New Profit (actual): $${profit3}
    `)

    expect(profit3).toBeCloseTo(expectedProfit3, 0)

    console.log(`
    ✅ FULL DOUBLE RENEWAL FLOW COMPLETED SUCCESSFULLY
    ================================================
    Initial Loan → 10 payments → Renewal → 10 payments → Renewal
    All profit inheritance calculations are correct!
    `)
  })

  // ==========================================================================
  // SCENARIO 5: Renewal with 0 Payments (Full Debt Pending)
  // ==========================================================================

  test('should correctly calculate profitHeredado when renewing with no payments made', async ({
    page,
  }) => {
    const requestedAmount = 3000
    const rate = parseFloat(testLoantype.rate)

    // Create initial loan
    const borrowerId = await getOrCreateBorrower(page, testLeadId)
    const initialLoan = await createLoan(
      page,
      borrowerId,
      testLoantype.id,
      testGrantorId,
      testLeadId,
      requestedAmount
    )

    const profitAmount = parseFloat(initialLoan.profitAmount)
    const totalDebtAcquired = parseFloat(initialLoan.totalDebtAcquired)
    const profitRatio = profitAmount / totalDebtAcquired

    console.log(`Initial Loan (No Payments Scenario):
      - Profit: $${profitAmount}
      - Total Debt: $${totalDebtAcquired}
      - Pending: $${initialLoan.pendingAmountStored} (full debt)
    `)

    // Renew without any payments
    // When no payments are made, pendingAmountStored = totalDebtAcquired
    // So profitHeredado = totalDebtAcquired × profitRatio = profitAmount (full profit inherited)
    const pendingAmountStored = parseFloat(initialLoan.pendingAmountStored)
    const expectedProfitHeredado = round2(pendingAmountStored * profitRatio)

    // Since pendingAmountStored = totalDebtAcquired, profitHeredado = profitAmount
    expect(expectedProfitHeredado).toBeCloseTo(profitAmount, 0)

    const amountGived = requestedAmount - pendingAmountStored // This will be negative or 0
    const renewedLoan = await renewLoan(
      page,
      initialLoan.id,
      testLoantype.id,
      requestedAmount,
      Math.max(0, amountGived) // Cap at 0
    )

    const profitBase = round2(requestedAmount * rate)
    const expectedNewProfit = round2(profitBase + expectedProfitHeredado)

    console.log(`Renewed Loan (0 payments):
      - Amount Given: $${Math.max(0, amountGived)} (capped at 0)
      - Profit Base: $${profitBase}
      - Profit Heredado: $${expectedProfitHeredado}
      - Expected New Profit: $${expectedNewProfit}
      - Actual New Profit: $${renewedLoan.profitAmount}
    `)

    expect(parseFloat(renewedLoan.profitAmount)).toBeCloseTo(expectedNewProfit, 0)
    expect(parseFloat(renewedLoan.amountGived)).toBe(0)

    console.log(`\n✅ ZERO PAYMENTS RENEWAL VERIFICATION PASSED`)
  })
})
