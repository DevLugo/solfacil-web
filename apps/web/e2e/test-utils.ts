import { Page, expect } from '@playwright/test'

// Test user credentials
export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'elugo.isi@gmail.com',
  password: process.env.TEST_USER_PASSWORD || 'test1234',
}

// Helper to login - with storageState support
export async function login(page: Page) {
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

// Helper to navigate to transactions page
export async function goToTransactions(page: Page) {
  await page.goto('/transacciones')
  await page.waitForLoadState('networkidle')
  await page.getByRole('heading', { name: /Operaciones del D.a/i }).waitFor({ timeout: 10000 })
}

// Helper to select route and wait for data
export async function selectRoute(page: Page) {
  const routeSelector = page.locator('button:has-text("Seleccionar ruta")')
  await routeSelector.click()
  const firstRoute = page.getByRole('option').first()
  await expect(firstRoute).toBeVisible({ timeout: 5000 })
  await firstRoute.click()
  await page.waitForTimeout(1000)
}

// Helper to select locality
export async function selectLocality(page: Page) {
  const localitySelector = page.locator('button:has-text("Todas las localidades")').or(
    page.locator('button:has-text("Seleccionar localidad")')
  )
  await localitySelector.click()

  // Select a specific locality (not "Todas las localidades")
  const localityOption = page.getByRole('option').filter({ hasNot: page.getByText('Todas las localidades') }).first()

  if (await localityOption.count() > 0) {
    await localityOption.click()
  } else {
    // If no specific locality, select the first available option
    const anyOption = page.getByRole('option').first()
    await anyOption.click()
  }
  await page.waitForTimeout(1000)
}

// Helper to setup creditos tab with route and locality selected
export async function setupCreditosTab(page: Page) {
  await selectRoute(page)
  await selectLocality(page)

  // Navigate to Creditos tab
  const creditosTab = page.getByRole('tab', { name: /Cr.ditos/i })
  await creditosTab.click()
  await page.waitForTimeout(2000)
}

// Helper to setup gastos tab with route selected
export async function setupGastosTab(page: Page) {
  await selectRoute(page)

  // Navigate to Gastos tab
  const gastosTab = page.getByRole('tab', { name: /Gastos/i })
  await gastosTab.click()
  await page.waitForTimeout(2000)
}

// Helper to setup abonos tab
export async function setupAbonosTab(page: Page): Promise<boolean> {
  await selectRoute(page)
  await selectLocality(page)

  // Navigate to Abonos tab
  const abonosTab = page.getByRole('tab', { name: /Abonos/i })
  await abonosTab.click()
  await page.waitForTimeout(2000)

  // Verify the tab loaded correctly
  const table = page.locator('table')
  return await table.count() > 0
}

// Helper to setup transferencias tab
export async function setupTransferenciasTab(page: Page) {
  await selectRoute(page)

  // Navigate to Transferencias tab
  const transferenciasTab = page.getByRole('tab', { name: /Transferencias/i })
  await transferenciasTab.click()
  await page.waitForTimeout(2000)
}

// Parse currency values (remove $ and commas)
export function parseCurrency(text: string | null): number {
  if (!text) return 0
  const match = text.match(/[\d,]+\.?\d*/)
  return match ? parseFloat(match[0].replace(/,/g, '')) : 0
}

// Helper to find an available payment input in the abonos table
export async function findAvailablePaymentInput(page: Page): Promise<{
  found: boolean
  row?: ReturnType<typeof page.locator>
  input?: ReturnType<typeof page.locator>
}> {
  const rows = page.locator('table tbody tr')
  const rowCount = await rows.count()

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i)
    const hasRegisteredBadge = await row.locator('text=Registrado').count() > 0

    if (!hasRegisteredBadge) {
      const paymentInput = row.locator('input[type="number"]').first()
      if (await paymentInput.count() > 0 && await paymentInput.isEnabled()) {
        return { found: true, row, input: paymentInput }
      }
    }
  }

  return { found: false }
}

// Helper to get displayed totals from KPI badges
export async function getDisplayedTotals(page: Page): Promise<{
  cash: number
  bank: number
  total: number
  hasBadges: boolean
}> {
  // Wait for badges to be visible
  await page.waitForTimeout(500)

  const cashBadge = page
    .locator('[class*="badge"]')
    .filter({ hasText: /Efectivo/i })
    .locator('text=/\\$/')
    .or(page.locator('text=Efectivo').locator('..').locator('text=/\\$/'))

  const bankBadge = page
    .locator('[class*="badge"]')
    .filter({ hasText: /Banco/i })
    .locator('text=/\\$/')
    .or(page.locator('text=Banco').locator('..').locator('text=/\\$/'))

  const totalBadge = page
    .locator('[class*="badge"]')
    .filter({ hasText: /Total/i })
    .locator('text=/\\$/')
    .or(page.locator('text=Total').locator('..').locator('text=/\\$/'))

  const cashText = await cashBadge.textContent({ timeout: 2000 }).catch(() => '$0')
  const bankText = await bankBadge.textContent({ timeout: 2000 }).catch(() => '$0')
  const totalText = await totalBadge.textContent({ timeout: 2000 }).catch(() => '$0')

  return {
    cash: parseCurrency(cashText),
    bank: parseCurrency(bankText),
    total: parseCurrency(totalText),
    hasBadges: (await cashBadge.count() > 0) || (await bankBadge.count() > 0) || (await totalBadge.count() > 0),
  }
}

// Helper to create a new expense via UI
export async function createExpenseViaUI(
  page: Page,
  amount: number,
  description: string = 'Test expense'
): Promise<boolean> {
  try {
    // Click "Agregar Gasto" button
    const addButton = page.getByRole('button', { name: /Agregar Gasto/i })
    await addButton.click()
    await page.waitForTimeout(300)

    // Find the new row (last row in pending section)
    const pendingRows = page.locator('table tbody tr')
    const lastRow = pendingRows.last()

    // Fill expense type
    const typeSelect = lastRow.locator('button[role="combobox"]').first()
    if (await typeSelect.count() > 0) {
      await typeSelect.click()
      const firstOption = page.getByRole('option').first()
      await firstOption.click()
    }

    // Fill amount
    const amountInput = lastRow.locator('input[type="number"]')
    if (await amountInput.count() > 0) {
      await amountInput.fill(amount.toString())
    }

    // Fill description
    const descInput = lastRow.locator('input[type="text"]')
    if (await descInput.count() > 0) {
      await descInput.fill(description)
    }

    return true
  } catch {
    return false
  }
}

// Helper to get all account balances from cards
export async function getAllAccountBalances(page: Page): Promise<Map<string, number>> {
  const balances = new Map<string, number>()

  await page.waitForSelector('.pt-6', { timeout: 5000 }).catch(() => null)

  const cardContents = page.locator('.pt-6')
  const cardCount = await cardContents.count()

  for (let i = 0; i < cardCount; i++) {
    const card = cardContents.nth(i)
    const nameElement = card.locator('p.text-sm.text-muted-foreground').first()
    const name = await nameElement.textContent().catch(() => null)
    const balanceElement = card.locator('p.text-xl.font-bold').first()
    const balanceText = await balanceElement.textContent().catch(() => null)

    if (name && balanceText) {
      const balance = parseFloat(balanceText.replace(/[$,]/g, ''))
      balances.set(name.trim(), balance)
    }
  }

  return balances
}

// Helper to find account with sufficient balance
export async function findAccountWithBalance(
  page: Page,
  minBalance: number
): Promise<{ name: string; balance: number } | null> {
  const balances = await getAllAccountBalances(page)

  for (const [name, balance] of balances) {
    if (balance >= minBalance) {
      return { name, balance }
    }
  }

  return null
}

// Helper to wait for table data to load
export async function waitForTableData(page: Page, timeout: number = 10000): Promise<boolean> {
  try {
    await page.waitForSelector('table tbody tr', { timeout })
    const rows = await page.locator('table tbody tr').count()
    return rows > 0
  } catch {
    return false
  }
}

// Helper to ensure there are pending expenses that can be edited
export async function ensureSavedExpenseExists(page: Page): Promise<boolean> {
  // Check if there are saved expense rows (not pending)
  const savedRows = page.locator('table tbody tr').filter({
    hasNot: page.locator('text=Pendiente'),
  })

  const savedCount = await savedRows.count()
  if (savedCount > 0) {
    return true
  }

  // If no saved expenses, create and save one
  console.log('No saved expenses found, creating one...')

  // Add a new expense
  const created = await createExpenseViaUI(page, 100, 'Test expense for editing')
  if (!created) return false

  // Save expenses
  const saveButton = page.getByRole('button', { name: /Guardar/i })
  if (await saveButton.count() > 0 && await saveButton.isEnabled()) {
    await saveButton.click()
    await page.waitForTimeout(2000)

    // Refresh to see saved data
    await page.reload()
    await page.waitForLoadState('networkidle')
    await setupGastosTab(page)

    return true
  }

  return false
}
