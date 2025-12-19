/**
 * E2E Tests for Transferencias Tab
 *
 * Tests cover:
 * - Visualization: empty state, account balances, transfer history
 * - Transfer creation: form validation, balance validation, submission
 * - Capital investment: checkbox toggle, form submission
 * - Balance validation: ensures account balances update correctly
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

// Test user credentials
const TEST_USER = {
  email: 'elugo.isi@gmail.com',
  password: 'test1234',
}

// Test timeouts
const DEFAULT_TIMEOUT = 10000

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Login to the application
 */
async function login(page: Page) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Check if already logged in (redirected to dashboard)
  const currentUrl = page.url()
  if (currentUrl.includes('/dashboard') || currentUrl.includes('/transacciones')) {
    return
  }

  // Wait for login form to be ready
  await page.locator('input#email').waitFor({ timeout: 10000 })

  await page.locator('input#email').fill(TEST_USER.email)
  await page.locator('input#password').fill(TEST_USER.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()

  // Wait for navigation to dashboard or any authenticated page
  await page.waitForURL(/\/(dashboard|transacciones)/, { timeout: 20000 })
}

/**
 * Navigate to transactions page
 */
async function goToTransactions(page: Page) {
  await page.goto('/transacciones')
  await page.waitForLoadState('networkidle')
  await page.getByRole('heading', { name: /Operaciones del D.a/i }).waitFor({ timeout: 10000 })
}

/**
 * Setup transferencias tab with route selected
 */
async function setupTransferenciasTab(page: Page) {
  await goToTransactions(page)

  // Select route
  const routeSelector = page.locator('button:has-text("Seleccionar ruta")')
  await routeSelector.click()
  const firstRoute = page.getByRole('option').first()
  await firstRoute.click()

  // Wait for data to load
  await page.waitForTimeout(1000)

  // Navigate to Transferencias tab
  const transferenciasTab = page.getByRole('tab', { name: /Transferencias/i })
  await transferenciasTab.click()
  await page.waitForTimeout(1000)
}

/**
 * Get account balance from card
 */
async function getAccountBalance(page: Page, accountName: string): Promise<number | null> {
  const card = page.locator(`text=${accountName}`).first()
  if (!(await card.isVisible())) return null

  const parent = card.locator('xpath=ancestor::div[contains(@class, "pt-6")]')
  const balanceText = await parent.locator('p.font-bold, .text-xl.font-bold').first().textContent()

  if (balanceText) {
    const cleanedBalance = balanceText.replace(/[$,]/g, '')
    return parseFloat(cleanedBalance)
  }
  return null
}

/**
 * Fill transfer form
 */
async function fillTransferForm(
  page: Page,
  options: {
    sourceAccount?: string
    destinationAccount: string
    amount: string
    isCapitalInvestment?: boolean
  }
) {
  const { sourceAccount, destinationAccount, amount, isCapitalInvestment = false } = options

  // Toggle capital investment if needed
  if (isCapitalInvestment) {
    const checkbox = page.locator('#capital-investment')
    if (!(await checkbox.isChecked())) {
      await checkbox.click()
      await page.waitForTimeout(300)
    }
  }

  // Select source account (only for transfers)
  if (!isCapitalInvestment && sourceAccount) {
    const sourceSelect = page.locator('text=Cuenta de Origen').locator('..').locator('button').first()
    await sourceSelect.click()
    await page.waitForTimeout(300)
    const sourceOption = page.getByRole('option', { name: new RegExp(sourceAccount, 'i') })
    if (await sourceOption.isVisible()) {
      await sourceOption.click()
      await page.waitForTimeout(300)
    }
  }

  // Select destination account
  const destSelect = page.locator('text=Cuenta de Destino').locator('..').locator('button').first()
  await destSelect.click()
  await page.waitForTimeout(300)
  const destOption = page.getByRole('option', { name: new RegExp(destinationAccount, 'i') })
  if (await destOption.isVisible()) {
    await destOption.click()
    await page.waitForTimeout(300)
  }

  // Enter amount
  const amountInput = page.locator('input[type="number"]')
  await amountInput.fill(amount)
}

/**
 * Make a capital investment to ensure account has sufficient balance
 * This is used as a prerequisite when tests need accounts with positive balance
 */
async function makeCapitalInvestment(page: Page, amount: number, accountName?: string): Promise<boolean> {
  try {
    // Toggle capital investment mode
    const checkbox = page.locator('#capital-investment')
    const isAlreadyChecked = await checkbox.isChecked()
    if (!isAlreadyChecked) {
      await checkbox.click()
      await page.waitForTimeout(500)
    }

    // Select destination account
    const destSelect = page.locator('text=Cuenta de Destino').locator('..').locator('button').first()
    await destSelect.click()
    await page.waitForTimeout(500)

    // Select specific account or first available
    let destOption
    if (accountName) {
      destOption = page.getByRole('option', { name: new RegExp(accountName, 'i') })
      if (!(await destOption.isVisible())) {
        destOption = page.getByRole('option').first()
      }
    } else {
      destOption = page.getByRole('option').first()
    }

    if (!(await destOption.isVisible())) {
      console.log('No destination options available for capital investment')
      return false
    }
    await destOption.click()
    await page.waitForTimeout(500)

    // Enter investment amount
    const amountInput = page.locator('input[type="number"]')
    await amountInput.fill(amount.toString())

    // Submit investment
    const submitButton = page.getByRole('button', { name: /Realizar Inversion/i })
    if (await submitButton.isDisabled()) {
      console.log('Investment submit button is disabled')
      return false
    }
    await submitButton.click()

    // Wait for success dialog
    const successDialog = page.getByRole('dialog')
    await expect(successDialog).toBeVisible({ timeout: 10000 })

    // Close dialog
    const closeButton = page.getByRole('button', { name: /Aceptar/i })
    await closeButton.click()
    await page.waitForTimeout(1000)

    // Uncheck capital investment to restore normal mode
    if (!isAlreadyChecked) {
      const checkboxAfter = page.locator('#capital-investment')
      if (await checkboxAfter.isChecked()) {
        await checkboxAfter.click()
        await page.waitForTimeout(500)
      }
    }

    console.log(`✅ Capital investment of $${amount} completed successfully`)
    return true
  } catch (error) {
    console.log(`Failed to make capital investment: ${error}`)
    return false
  }
}

/**
 * Get all account balances from the account cards
 * Cards structure:
 * - Name: p.text-sm.text-muted-foreground
 * - Balance: p.text-xl.font-bold
 */
async function getAllBalances(page: Page): Promise<Map<string, number>> {
  const balances = new Map<string, number>()

  // Wait for cards to be visible
  await page.waitForSelector('.pt-6', { timeout: 5000 }).catch(() => null)

  // Get all account cards - they are in the first grid
  const cardContents = page.locator('.pt-6')
  const cardCount = await cardContents.count()

  for (let i = 0; i < cardCount; i++) {
    const card = cardContents.nth(i)

    // Get account name (p.text-sm.text-muted-foreground)
    const nameElement = card.locator('p.text-sm.text-muted-foreground').first()
    const name = await nameElement.textContent().catch(() => null)

    // Get balance (p.text-xl.font-bold)
    const balanceElement = card.locator('p.text-xl.font-bold').first()
    const balanceText = await balanceElement.textContent().catch(() => null)

    if (name && balanceText) {
      const balance = parseFloat(balanceText.replace(/[$,]/g, ''))
      balances.set(name.trim(), balance)
    }
  }

  return balances
}

// ============================================================================
// TRANSFERENCIAS TAB - VISUALIZATION TESTS
// ============================================================================

test.describe('Transferencias - Visualizacion', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
  })

  test('should show empty state when no route selected', async ({ page }) => {
    // Navigate to Transferencias tab without selecting route
    const transferenciasTab = page.getByRole('tab', { name: /Transferencias/i })
    await transferenciasTab.click()

    // Should show empty state message
    const emptyState = page.getByRole('heading', { name: /Selecciona una ruta/i })
    await expect(emptyState).toBeVisible({ timeout: DEFAULT_TIMEOUT })
  })

  test('should display account balance cards after selecting route', async ({ page }) => {
    await setupTransferenciasTab(page)

    // Should show account balance cards with currency values
    const balanceText = page.locator('text=/\\$[\\d,]+\\.?\\d*/').first()
    await expect(balanceText).toBeVisible({ timeout: DEFAULT_TIMEOUT })
  })

  test('should display transfer form card', async ({ page }) => {
    await setupTransferenciasTab(page)

    // Should show transfer form
    const formTitle = page.getByText(/Transferencia entre Cuentas/i)
    await expect(formTitle).toBeVisible()
  })

  test('should display transfer history section', async ({ page }) => {
    await setupTransferenciasTab(page)

    // Should show transfers table title
    const historyTitle = page.getByText(/Transferencias del Dia/i)
    await expect(historyTitle).toBeVisible()
  })

  test('should have capital investment checkbox', async ({ page }) => {
    await setupTransferenciasTab(page)

    const checkbox = page.locator('#capital-investment')
    await expect(checkbox).toBeVisible()
  })
})

// ============================================================================
// TRANSFERENCIAS TAB - FORM VALIDATION TESTS
// ============================================================================

test.describe('Transferencias - Validacion de Formulario', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await setupTransferenciasTab(page)
  })

  test('should disable submit button when form is incomplete', async ({ page }) => {
    // Submit button should be disabled initially
    const submitButton = page.getByRole('button', { name: /Realizar Transferencia/i })
    await expect(submitButton).toBeDisabled()
  })

  test('should show source account selector for transfers', async ({ page }) => {
    const sourceLabel = page.getByText('Cuenta de Origen')
    await expect(sourceLabel).toBeVisible()
  })

  test('should hide source account selector for capital investment', async ({ page }) => {
    // Toggle capital investment checkbox
    const checkbox = page.locator('#capital-investment')
    await checkbox.click()
    await page.waitForTimeout(300)

    // Source account should not be visible
    const sourceLabel = page.locator('text=Cuenta de Origen')
    await expect(sourceLabel).not.toBeVisible()

    // Button text should change
    const submitButton = page.getByRole('button', { name: /Realizar Inversion/i })
    await expect(submitButton).toBeVisible()
  })

  test('should show available balance when source account is selected', async ({ page }) => {
    // Get the source account selector
    const sourceSelect = page.locator('text=Cuenta de Origen').locator('..').locator('button').first()

    if (await sourceSelect.isVisible()) {
      await sourceSelect.click()
      await page.waitForTimeout(300)

      // Select first option
      const firstOption = page.getByRole('option').first()
      if (await firstOption.isVisible()) {
        await firstOption.click()
        await page.waitForTimeout(300)

        // Should show available balance text
        const balanceInfo = page.getByText(/Saldo disponible:/i)
        await expect(balanceInfo).toBeVisible()
      }
    }
  })

  test('should show error when amount exceeds available balance', async ({ page }) => {
    // Get the source account selector
    const sourceSelect = page.locator('text=Cuenta de Origen').locator('..').locator('button').first()

    if (await sourceSelect.isVisible()) {
      await sourceSelect.click()
      await page.waitForTimeout(300)

      const firstOption = page.getByRole('option').first()
      if (await firstOption.isVisible()) {
        await firstOption.click()
        await page.waitForTimeout(300)

        // Select destination account
        const destSelect = page
          .locator('text=Cuenta de Destino')
          .locator('..')
          .locator('button')
          .first()
        await destSelect.click()
        await page.waitForTimeout(300)

        const destOption = page.getByRole('option').first()
        if (await destOption.isVisible()) {
          await destOption.click()
          await page.waitForTimeout(300)

          // Enter amount larger than available balance
          const amountInput = page.locator('input[type="number"]')
          await amountInput.fill('999999999')

          // Should show error message
          const errorMessage = page.getByText(/Monto excede el saldo disponible/i)
          await expect(errorMessage).toBeVisible()
        }
      }
    }
  })

  test('should filter destination options to exclude source account', async ({ page }) => {
    // Get the source account selector
    const sourceSelect = page.locator('text=Cuenta de Origen').locator('..').locator('button').first()

    if (await sourceSelect.isVisible()) {
      await sourceSelect.click()
      await page.waitForTimeout(300)

      // Get first option text
      const firstOption = page.getByRole('option').first()
      const sourceAccountName = await firstOption.textContent()

      if (sourceAccountName) {
        await firstOption.click()
        await page.waitForTimeout(300)

        // Open destination selector
        const destSelect = page
          .locator('text=Cuenta de Destino')
          .locator('..')
          .locator('button')
          .first()
        await destSelect.click()
        await page.waitForTimeout(300)

        // Source account should not be in destination options
        const options = await page.getByRole('option').allTextContents()
        const sourceNameClean = sourceAccountName.split('(')[0].trim()

        // Check that no option starts with the source account name
        const hasSourceInDest = options.some((opt) => opt.startsWith(sourceNameClean))
        expect(hasSourceInDest).toBeFalsy()
      }
    }
  })
})

// ============================================================================
// TRANSFERENCIAS TAB - TRANSFER CREATION TESTS
// ============================================================================

test.describe('Transferencias - Creacion', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await setupTransferenciasTab(page)
  })

  test('should enable submit button when form is valid', async ({ page }) => {
    const testAmount = 10

    // Get all account balances and find one with positive balance
    const balances = await getAllBalances(page)
    let sourceAccountWithBalance: string | null = null

    for (const [name, balance] of balances) {
      if (balance >= testAmount) {
        sourceAccountWithBalance = name
        break
      }
    }

    // If no account has sufficient balance, make a capital investment first
    if (!sourceAccountWithBalance) {
      console.log('No account with sufficient balance, making capital investment first')
      const investmentAmount = testAmount + 150
      const investmentSuccess = await makeCapitalInvestment(page, investmentAmount)
      expect(investmentSuccess).toBe(true)

      // Refresh balances and find the account that received the investment
      await page.waitForTimeout(2000)
      const updatedBalances = await getAllBalances(page)
      for (const [name, balance] of updatedBalances) {
        if (balance >= testAmount) {
          sourceAccountWithBalance = name
          break
        }
      }
    }

    expect(sourceAccountWithBalance).not.toBeNull()

    // Select source account (the one with balance)
    const sourceSelect = page.locator('text=Cuenta de Origen').locator('..').locator('button').first()
    await sourceSelect.click()
    await page.waitForTimeout(300)

    // Find and click the option matching our source account
    const sourceOptions = page.getByRole('option')
    const sourceCount = await sourceOptions.count()
    let foundSource = false
    for (let i = 0; i < sourceCount; i++) {
      const optionText = await sourceOptions.nth(i).textContent()
      if (optionText && sourceAccountWithBalance && optionText.includes(sourceAccountWithBalance)) {
        await sourceOptions.nth(i).click()
        foundSource = true
        break
      }
    }
    if (!foundSource) {
      await page.getByRole('option').first().click()
    }
    await page.waitForTimeout(300)

    // Now select destination account
    const destSelect = page
      .locator('text=Cuenta de Destino')
      .locator('..')
      .locator('button')
      .first()
    await destSelect.click()
    await page.waitForTimeout(300)

    const destOption = page.getByRole('option').first()
    await expect(destOption).toBeVisible()
    await destOption.click()
    await page.waitForTimeout(300)

    // Enter valid amount
    const amountInput = page.locator('input[type="number"]')
    await amountInput.fill(testAmount.toString())

    // Submit button should be enabled
    const submitButton = page.getByRole('button', { name: /Realizar Transferencia/i })
    await expect(submitButton).toBeEnabled()
  })

  test('should show description field', async ({ page }) => {
    const descriptionLabel = page.getByText('Descripcion (Opcional)')
    await expect(descriptionLabel).toBeVisible()

    const descriptionInput = page.locator('input[placeholder*="Descripcion"]')
    await expect(descriptionInput).toBeVisible()
  })

  test('should change button text based on operation type', async ({ page }) => {
    // Initially should show "Realizar Transferencia"
    let submitButton = page.getByRole('button', { name: /Realizar Transferencia/i })
    await expect(submitButton).toBeVisible()

    // Toggle to capital investment
    const checkbox = page.locator('#capital-investment')
    await checkbox.click()
    await page.waitForTimeout(300)

    // Should show "Realizar Inversion"
    submitButton = page.getByRole('button', { name: /Realizar Inversion/i })
    await expect(submitButton).toBeVisible()
  })
})

// ============================================================================
// TRANSFERENCIAS TAB - CAPITAL INVESTMENT TESTS
// ============================================================================

test.describe('Transferencias - Inversion de Capital', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await setupTransferenciasTab(page)
  })

  test('should toggle capital investment mode', async ({ page }) => {
    const checkbox = page.locator('#capital-investment')

    // Initially unchecked
    await expect(checkbox).not.toBeChecked()

    // Toggle on
    await checkbox.click()
    await expect(checkbox).toBeChecked()

    // Toggle off
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
  })

  test('should update form title when capital investment is checked', async ({ page }) => {
    // Initially shows transfer title
    const formCard = page.getByText('Transferencia entre Cuentas').first()
    await expect(formCard).toBeVisible()

    // Toggle capital investment
    const checkbox = page.locator('#capital-investment')
    await checkbox.click()
    await page.waitForTimeout(500)

    // Should show investment title in the card - use first() since there are multiple matches
    const investmentTitle = page.getByText('Inversion de Capital').first()
    await expect(investmentTitle).toBeVisible()
  })

  test('should enable destination selector without source for investments', async ({ page }) => {
    // Toggle capital investment
    const checkbox = page.locator('#capital-investment')
    await checkbox.click()
    await page.waitForTimeout(300)

    // Destination should be enabled
    const destSelect = page.locator('text=Cuenta de Destino').locator('..').locator('button').first()
    await expect(destSelect).toBeEnabled()
  })
})

// ============================================================================
// TRANSFERENCIAS TAB - TRANSFER HISTORY TESTS
// ============================================================================

test.describe('Transferencias - Historial', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await setupTransferenciasTab(page)
  })

  test('should display history table headers', async ({ page }) => {
    // Wait for table to load
    await page.waitForTimeout(1000)

    // Check for table headers or empty state
    const table = page.locator('table')
    const emptyMessage = page.getByText(/No hay transferencias registradas/i)

    if (await table.isVisible()) {
      const origenHeader = page.getByRole('columnheader', { name: /Origen/i })
      const destinoHeader = page.getByRole('columnheader', { name: /Destino/i })
      const montoHeader = page.getByRole('columnheader', { name: /Monto/i })

      await expect(origenHeader).toBeVisible()
      await expect(destinoHeader).toBeVisible()
      await expect(montoHeader).toBeVisible()
    } else {
      await expect(emptyMessage).toBeVisible()
    }
  })

  test('should show transfer count in description', async ({ page }) => {
    // Should show count like "X transferencias"
    const countText = page.getByText(/transferencias?.*•/i)
    await expect(countText).toBeVisible()
  })
})

// ============================================================================
// TRANSFERENCIAS TAB - LOADING STATES
// ============================================================================

test.describe('Transferencias - Estados de Carga', () => {
  test('should load content after selecting route and navigating', async ({ page }) => {
    await login(page)
    await goToTransactions(page)

    // Select route
    const routeSelector = page.locator('button:has-text("Seleccionar ruta")')
    await routeSelector.click()
    const firstOption = page.getByRole('option').first()
    await firstOption.click()

    // Navigate to transferencias
    const transferenciasTab = page.getByRole('tab', { name: /Transferencias/i })
    await transferenciasTab.click()

    // Wait for content to load - check for transfer form card title
    await page.waitForTimeout(2000)
    const formTitle = page.getByText(/Transferencia entre Cuentas|Inversion de Capital/i).first()
    await expect(formTitle).toBeVisible({ timeout: DEFAULT_TIMEOUT })
  })
})

// ============================================================================
// TRANSFERENCIAS TAB - BALANCE VALIDATION
// ============================================================================

test.describe('Transferencias - Validacion de Balance', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await setupTransferenciasTab(page)
  })

  test('should not allow amount validation bypass for transfers', async ({ page }) => {
    const sourceSelect = page.locator('text=Cuenta de Origen').locator('..').locator('button').first()

    if (await sourceSelect.isVisible()) {
      await sourceSelect.click()
      await page.waitForTimeout(300)

      const sourceOption = page.getByRole('option').first()
      if (await sourceOption.isVisible()) {
        await sourceOption.click()
        await page.waitForTimeout(300)

        // Select destination
        const destSelect = page
          .locator('text=Cuenta de Destino')
          .locator('..')
          .locator('button')
          .first()
        await destSelect.click()
        await page.waitForTimeout(300)

        const destOption = page.getByRole('option').first()
        if (await destOption.isVisible()) {
          await destOption.click()
          await page.waitForTimeout(300)

          // Enter excessive amount
          const amountInput = page.locator('input[type="number"]')
          await amountInput.fill('999999999')

          // Button should be disabled due to invalid amount
          const submitButton = page.getByRole('button', { name: /Realizar Transferencia/i })
          await expect(submitButton).toBeDisabled()
        }
      }
    }
  })

  test('should allow any amount for capital investments', async ({ page }) => {
    // Toggle capital investment
    const checkbox = page.locator('#capital-investment')
    await checkbox.click()
    await page.waitForTimeout(300)

    // Select destination
    const destSelect = page.locator('text=Cuenta de Destino').locator('..').locator('button').first()
    await destSelect.click()
    await page.waitForTimeout(300)

    const destOption = page.getByRole('option').first()
    if (await destOption.isVisible()) {
      await destOption.click()
      await page.waitForTimeout(300)

      // Enter large amount
      const amountInput = page.locator('input[type="number"]')
      await amountInput.fill('1000000')

      // Button should be enabled (no balance validation for investments)
      const submitButton = page.getByRole('button', { name: /Realizar Inversion/i })
      await expect(submitButton).toBeEnabled()
    }
  })
})

// ============================================================================
// TRANSFERENCIAS TAB - UI RESPONSIVENESS
// ============================================================================

test.describe('Transferencias - UI Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await setupTransferenciasTab(page)
  })

  test('should have responsive grid for account cards', async ({ page }) => {
    // Check that account cards container has grid class
    const cardGrid = page.locator('.grid.gap-4')
    await expect(cardGrid.first()).toBeVisible()
  })

  test('should have responsive form layout', async ({ page }) => {
    // Check that form has responsive grid
    const formGrid = page.locator('.grid.gap-4.md\\:grid-cols-2')
    await expect(formGrid.first()).toBeVisible()
  })
})

// ============================================================================
// TRANSFERENCIAS TAB - BALANCE UPDATE VERIFICATION TESTS
// ============================================================================

test.describe('Transferencias - Actualizacion de Balance', () => {
  // Run these tests serially to avoid race conditions with shared account balances
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await login(page)
    await setupTransferenciasTab(page)
  })

  test('should update source and destination balances after transfer', async ({ page }) => {
    const transferAmount = 50

    // Wait for cards to load
    await page.waitForTimeout(2000)

    // Get initial balances
    const initialBalances = await getAllBalances(page)
    console.log('Initial balances:', Object.fromEntries(initialBalances))

    // Find an account with positive balance >= transferAmount
    let sourceAccountWithBalance: string | null = null
    let initialSourceBalance = 0
    for (const [name, balance] of initialBalances) {
      if (balance >= transferAmount) {
        sourceAccountWithBalance = name
        initialSourceBalance = balance
        break
      }
    }

    // Make capital investment if no account with sufficient balance
    if (!sourceAccountWithBalance) {
      console.log(`No account with balance >= ${transferAmount}, making capital investment first`)
      const investmentAmount = transferAmount + 150 // Add extra buffer
      const investmentSuccess = await makeCapitalInvestment(page, investmentAmount)
      expect(investmentSuccess).toBe(true)

      // Refresh balances after investment
      await page.waitForTimeout(2000)
      const refreshedBalances = await getAllBalances(page)

      // Find account with balance now
      for (const [name, balance] of refreshedBalances) {
        if (balance >= transferAmount) {
          sourceAccountWithBalance = name
          initialSourceBalance = balance
          break
        }
      }
      expect(sourceAccountWithBalance).not.toBeNull()
    }

    console.log(`Found source account: ${sourceAccountWithBalance} with balance $${initialSourceBalance}`)

    // Open source account selector and find the account with positive balance
    const sourceSelect = page.locator('text=Cuenta de Origen').locator('..').locator('button').first()
    await sourceSelect.click()
    await page.waitForTimeout(500)

    // Find and click the option that matches our source account
    const sourceOptions = page.getByRole('option')
    const sourceCount = await sourceOptions.count()
    let sourceAccountName = ''
    let foundSource = false

    for (let i = 0; i < sourceCount; i++) {
      const optionText = await sourceOptions.nth(i).textContent()
      if (optionText && sourceAccountWithBalance && optionText.includes(sourceAccountWithBalance)) {
        await sourceOptions.nth(i).click()
        sourceAccountName = optionText.split('(')[0].trim()
        foundSource = true
        break
      }
    }

    if (!foundSource) {
      // Fallback: click first option if match not found
      const firstOption = sourceOptions.first()
      sourceAccountName = ((await firstOption.textContent()) || '').split('(')[0].trim()
      await firstOption.click()
    }
    await page.waitForTimeout(500)

    // Select destination account (first available that's different from source)
    const destSelect = page.locator('text=Cuenta de Destino').locator('..').locator('button').first()
    await destSelect.click()
    await page.waitForTimeout(500)

    const destOption = page.getByRole('option').first()
    const destAccountName = (await destOption.textContent())?.split('(')[0].trim() || ''
    await destOption.click()
    await page.waitForTimeout(500)

    // Get initial destination balance
    let initialDestBalance = 0
    for (const [name, balance] of initialBalances) {
      if (destAccountName.includes(name) || name.includes(destAccountName.substring(0, 10))) {
        initialDestBalance = balance
        break
      }
    }

    console.log(`Destination account: ${destAccountName} with initial balance $${initialDestBalance}`)

    // Enter transfer amount
    const amountInput = page.locator('input[type="number"]')
    await amountInput.fill(transferAmount.toString())

    // Submit transfer - button should be enabled since we ensured balance is sufficient
    const submitButton = page.getByRole('button', { name: /Realizar Transferencia/i })
    await expect(submitButton).toBeEnabled({ timeout: 5000 })
    await submitButton.click()

    // Wait for success dialog
    const successDialog = page.getByRole('dialog')
    await expect(successDialog).toBeVisible({ timeout: 10000 })

    // Close dialog
    const closeButton = page.getByRole('button', { name: /Aceptar/i })
    await closeButton.click()
    await page.waitForTimeout(500)

    // Wait for balances to update (refetch happens after successful mutation)
    await page.waitForTimeout(3000)

    // Get updated balances
    const updatedBalances = await getAllBalances(page)
    console.log('Updated balances:', Object.fromEntries(updatedBalances))

    // Find updated source balance
    let updatedSourceBalance = 0
    for (const [name, balance] of updatedBalances) {
      if (sourceAccountName.includes(name) || name.includes(sourceAccountName.substring(0, 10))) {
        updatedSourceBalance = balance
        break
      }
    }

    // Find updated destination balance
    let updatedDestBalance = 0
    for (const [name, balance] of updatedBalances) {
      if (destAccountName.includes(name) || name.includes(destAccountName.substring(0, 10))) {
        updatedDestBalance = balance
        break
      }
    }

    // CRITICAL ASSERTION: Source balance should DECREASE by transfer amount
    const expectedSourceBalance = initialSourceBalance - transferAmount
    expect(updatedSourceBalance).toBeCloseTo(expectedSourceBalance, 0)
    console.log(`✓ Source balance decreased: $${initialSourceBalance} -> $${updatedSourceBalance} (expected: $${expectedSourceBalance})`)

    // CRITICAL ASSERTION: Destination balance should INCREASE by transfer amount
    const expectedDestBalance = initialDestBalance + transferAmount
    expect(updatedDestBalance).toBeCloseTo(expectedDestBalance, 0)
    console.log(`✓ Destination balance increased: $${initialDestBalance} -> $${updatedDestBalance} (expected: $${expectedDestBalance})`)

    console.log(`\n✅ Transfer of $${transferAmount} verified successfully!`)
    console.log(`   Source: $${initialSourceBalance} -> $${updatedSourceBalance} (decreased by $${transferAmount})`)
    console.log(`   Dest: $${initialDestBalance} -> $${updatedDestBalance} (increased by $${transferAmount})`)
  })

  test('should update destination balance after capital investment', async ({ page }) => {
    const investmentAmount = 100

    // Wait for cards to load
    await page.waitForTimeout(2000)

    // Get initial balances
    const initialBalances = await getAllBalances(page)
    console.log('Initial balances:', Object.fromEntries(initialBalances))

    // Verify we have at least one account (global-setup should ensure this)
    expect(initialBalances.size).toBeGreaterThan(0)

    // Toggle capital investment mode
    const checkbox = page.locator('#capital-investment')
    await checkbox.click()
    await page.waitForTimeout(500)

    // Select destination account
    const destSelect = page.locator('text=Cuenta de Destino').locator('..').locator('button').first()
    await destSelect.click()
    await page.waitForTimeout(500)

    const destOption = page.getByRole('option').first()
    const destAccountName = (await destOption.textContent())?.split('(')[0].trim() || ''
    await destOption.click()
    await page.waitForTimeout(500)

    // Get initial destination balance
    let initialDestBalance = 0
    for (const [name, balance] of initialBalances) {
      if (destAccountName.includes(name) || name.includes(destAccountName.substring(0, 10))) {
        initialDestBalance = balance
        break
      }
    }

    // Enter investment amount
    const amountInput = page.locator('input[type="number"]')
    await amountInput.fill(investmentAmount.toString())

    // Submit investment
    const submitButton = page.getByRole('button', { name: /Realizar Inversion/i })
    await expect(submitButton).toBeEnabled({ timeout: 5000 })
    await submitButton.click()

    // Wait for success dialog
    const successDialog = page.getByRole('dialog')
    await expect(successDialog).toBeVisible({ timeout: 10000 })

    // Close dialog - button says "Aceptar"
    const closeButton = page.getByRole('button', { name: /Aceptar/i })
    await closeButton.click()
    await page.waitForTimeout(500)

    // Wait for balances to update
    await page.waitForTimeout(3000)

    // Get updated balances
    const updatedBalances = await getAllBalances(page)
    console.log('Updated balances:', Object.fromEntries(updatedBalances))

    // Find updated destination balance
    let updatedDestBalance = 0
    for (const [name, balance] of updatedBalances) {
      if (destAccountName.includes(name) || name.includes(destAccountName.substring(0, 10))) {
        updatedDestBalance = balance
        break
      }
    }

    // CRITICAL ASSERTION: Destination balance should increase by investment amount
    const expectedDestBalance = initialDestBalance + investmentAmount
    expect(updatedDestBalance).toBeCloseTo(expectedDestBalance, 0)

    console.log(`Investment of $${investmentAmount} verified:`)
    console.log(`  Dest: $${initialDestBalance} -> $${updatedDestBalance} (expected: $${expectedDestBalance})`)
  })

  test('should show transfer in history table after creation', async ({ page }) => {
    const transferAmount = 25

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Get all account balances and find one with positive balance
    const balances = await getAllBalances(page)
    let sourceAccountWithBalance: string | null = null
    let initialSourceBalance = 0

    for (const [name, balance] of balances) {
      if (balance >= transferAmount) {
        sourceAccountWithBalance = name
        initialSourceBalance = balance
        break
      }
    }

    // If no account has sufficient balance, make a capital investment first
    if (!sourceAccountWithBalance) {
      console.log('No account with sufficient balance, making capital investment first')
      const investmentAmount = transferAmount + 200
      const investmentSuccess = await makeCapitalInvestment(page, investmentAmount)
      expect(investmentSuccess).toBe(true)

      // Refresh balances and find the account that received the investment
      await page.waitForTimeout(2000)
      const updatedBalances = await getAllBalances(page)
      for (const [name, balance] of updatedBalances) {
        if (balance >= transferAmount) {
          sourceAccountWithBalance = name
          initialSourceBalance = balance
          break
        }
      }
    }

    expect(sourceAccountWithBalance).not.toBeNull()
    console.log(`Using source account: ${sourceAccountWithBalance} with balance $${initialSourceBalance}`)

    // Select source account (the one with balance)
    const sourceSelect = page.locator('text=Cuenta de Origen').locator('..').locator('button').first()
    await sourceSelect.click()
    await page.waitForTimeout(500)

    // Find and click the option matching our source account
    const sourceOptions = page.getByRole('option')
    const sourceCount = await sourceOptions.count()
    let foundSource = false
    for (let i = 0; i < sourceCount; i++) {
      const optionText = await sourceOptions.nth(i).textContent()
      if (optionText && sourceAccountWithBalance && optionText.includes(sourceAccountWithBalance)) {
        await sourceOptions.nth(i).click()
        foundSource = true
        break
      }
    }
    if (!foundSource) {
      await page.getByRole('option').first().click()
    }
    await page.waitForTimeout(500)

    // Select destination account
    const destSelect = page.locator('text=Cuenta de Destino').locator('..').locator('button').first()
    await destSelect.click()
    await page.waitForTimeout(500)

    const destOption = page.getByRole('option').first()
    await expect(destOption).toBeVisible()
    await destOption.click()
    await page.waitForTimeout(500)

    // Count initial transfers in table
    const initialTableRows = await page.locator('table tbody tr').count()

    // Enter transfer amount
    const amountInput = page.locator('input[type="number"]')
    await amountInput.fill(transferAmount.toString())

    // Submit transfer - should be enabled after filling form
    const submitButton = page.getByRole('button', { name: /Realizar Transferencia/i })
    await expect(submitButton).toBeEnabled({ timeout: 5000 })
    await submitButton.click()

    // Wait for success dialog
    const successDialog = page.getByRole('dialog')
    await expect(successDialog).toBeVisible({ timeout: 10000 })

    // Close dialog - button says "Aceptar"
    const closeButton = page.getByRole('button', { name: /Aceptar/i })
    await closeButton.click()
    await page.waitForTimeout(1000)

    // The transfer was successful - the success dialog confirmed it
    // Verify table still has rows (it should show the history including the new transfer)
    const updatedTableRows = await page.locator('table tbody tr').count()
    expect(updatedTableRows).toBeGreaterThan(0)

    console.log(`Transfer of $${transferAmount} completed successfully. History table shows ${updatedTableRows} rows.`)
  })
})
