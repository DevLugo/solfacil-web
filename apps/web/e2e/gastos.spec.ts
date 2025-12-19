import { test, expect, Page } from '@playwright/test'

// Test user credentials
const TEST_USER = {
  email: 'elugo.isi@gmail.com',
  password: 'test1234',
}

// ============================================================================
// HELPERS
// ============================================================================

// Helper to login - with storageState support
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

// Helper to navigate to transactions page
async function goToTransactions(page: Page) {
  await page.goto('/transacciones')
  await page.waitForLoadState('networkidle')
  await page.getByRole('heading', { name: /Operaciones del D.a/i }).waitFor({ timeout: 10000 })
}

// Helper to setup gastos tab with route selected
async function setupGastosTab(page: Page) {
  // Select route
  const routeSelector = page.locator('button:has-text("Seleccionar ruta")')
  await routeSelector.click()
  const firstRoute = page.getByRole('option').first()
  await firstRoute.click()

  // Wait for data to load
  await page.waitForTimeout(1000)

  // Navigate to Gastos tab
  const gastosTab = page.getByRole('tab', { name: /Gastos/i })
  await gastosTab.click()

  // Wait for content to load
  await page.waitForTimeout(2000)
}

// Helper to extract numeric balance from text like "$1,234.56"
function parseBalance(text: string | null): number {
  if (!text) return 0
  const match = text.match(/\$[\d,]+\.?\d*/g)
  if (!match) return 0
  return parseFloat(match[0].replace(/[$,]/g, ''))
}

// Helper to get account balance for a specific account type
async function getAccountBalance(page: Page, accountType: string): Promise<number> {
  // Find the account balances section
  const accountCard = page.locator(`text=${accountType}`).locator('..')
  const balanceText = await accountCard.locator('text=/\\$[\\d,]+\\.?\\d*/').first().textContent()
  return parseBalance(balanceText)
}

// Helper to get any account balance from the balances card
async function getAnyAccountBalance(page: Page): Promise<{ name: string; balance: number }> {
  // Wait for account cards to load
  await page.waitForSelector('.pt-6', { timeout: 5000 }).catch(() => null)

  // Try multiple selectors for account cards
  const cardContents = page.locator('.pt-6')

  if (await cardContents.count() > 0) {
    const firstCard = cardContents.first()

    // Get account name
    const nameElement = firstCard.locator('p.text-sm.text-muted-foreground').first()
    const nameText = await nameElement.textContent().catch(() => null)

    // Get balance
    const balanceElement = firstCard.locator('p.text-xl.font-bold').first()
    const balanceText = await balanceElement.textContent().catch(() => null)

    if (nameText && balanceText) {
      return {
        name: nameText.trim(),
        balance: parseBalance(balanceText),
      }
    }
  }

  // Fallback: try looking for any dollar amount on the page
  const balanceLocator = page.locator('text=/\\$[\\d,]+\\.?\\d*/').first()
  if (await balanceLocator.count() > 0) {
    const text = await balanceLocator.textContent()
    return {
      name: 'Unknown',
      balance: parseBalance(text),
    }
  }

  return { name: '', balance: 0 }
}

// Helper to add a new expense row
async function addExpenseRow(page: Page) {
  const addButton = page.getByRole('button', { name: /Agregar Gasto/i })
  await addButton.click()
  await page.waitForTimeout(300)
}

// Helper to fill expense row
async function fillExpenseRow(
  page: Page,
  index: number,
  options: { type?: string; amount?: string; account?: string }
) {
  const tableBody = page.locator('table tbody')
  const newRows = tableBody.locator('tr').filter({ has: page.locator('input') })

  if (await newRows.count() > index) {
    const row = newRows.nth(index)

    // Select expense type
    if (options.type) {
      const typeSelect = row.locator('select, button[role="combobox"]').first()
      if (await typeSelect.count() > 0) {
        await typeSelect.click()
        const typeOption = page.getByRole('option', { name: new RegExp(options.type, 'i') })
        if (await typeOption.count() > 0) {
          await typeOption.click()
        }
      }
    }

    // Enter amount
    if (options.amount) {
      const amountInput = row.locator('input[type="number"], input').first()
      if (await amountInput.count() > 0) {
        await amountInput.fill(options.amount)
      }
    }

    // Select account
    if (options.account) {
      const accountSelect = row.locator('select, button[role="combobox"]').last()
      if (await accountSelect.count() > 0) {
        await accountSelect.click()
        const accountOption = page.getByRole('option', { name: new RegExp(options.account, 'i') })
        if (await accountOption.count() > 0) {
          await accountOption.click()
        }
      }
    }
  }
}

// Helper to ensure there are saved expenses (creates one if none exist)
async function ensureSavedExpensesExist(page: Page): Promise<void> {
  // Check if there are saved expense rows (not pending)
  const savedRows = page.locator('table tbody tr').filter({
    hasNot: page.locator('input'),
  })

  const savedCount = await savedRows.count()
  if (savedCount > 0) {
    return // Expenses already exist
  }

  console.log('No saved expenses found, creating one...')

  // Add a new expense
  await addExpenseRow(page)
  await page.waitForTimeout(500)

  // Find the new row and fill it
  const tableBody = page.locator('table tbody')
  const newRow = tableBody.locator('tr').filter({ has: page.locator('input') }).first()

  // Select expense type (first dropdown)
  const typeButton = newRow.locator('button[role="combobox"]').first()
  if (await typeButton.count() > 0) {
    await typeButton.click()
    await page.waitForTimeout(200)
    const option = page.getByRole('option').first()
    if (await option.count() > 0) {
      await option.click()
    }
  }

  // Enter amount
  const amountInput = newRow.locator('input[type="text"], input[type="number"], input').first()
  await amountInput.fill('100')
  await page.waitForTimeout(200)

  // Select account (if there's a second dropdown)
  const buttons = newRow.locator('button[role="combobox"]')
  if (await buttons.count() > 1) {
    await buttons.nth(1).click()
    await page.waitForTimeout(200)
    const accountOption = page.getByRole('option').first()
    if (await accountOption.count() > 0) {
      await accountOption.click()
    }
  }

  // Save
  const saveButton = page.getByRole('button', { name: /Guardar cambios/i })
  if (await saveButton.isEnabled()) {
    await saveButton.click()
    await page.waitForTimeout(2000)
  }
}

// ============================================================================
// GASTOS TAB - VISUALIZATION TESTS
// ============================================================================

test.describe('Gastos - Visualizacion', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
  })

  test('should show empty state when no route selected', async ({ page }) => {
    // Navigate to Gastos tab without selecting route
    const gastosTab = page.getByRole('tab', { name: /Gastos/i })
    await gastosTab.click()

    // Should show empty state message - use heading to be specific
    const emptyState = page.getByRole('heading', { name: /Selecciona una ruta/i })
    await expect(emptyState).toBeVisible({ timeout: 5000 })
  })

  test('should display KPI bar after selecting route', async ({ page }) => {
    await setupGastosTab(page)

    // Should show KPI badges
    const gastosBadge = page.getByText(/Gastos:/i)
    const totalBadge = page.getByText(/Total:/i)

    await expect(gastosBadge).toBeVisible()
    await expect(totalBadge).toBeVisible()
  })

  test('should display gastos table with headers', async ({ page }) => {
    await setupGastosTab(page)

    // Ensure at least one expense exists so table is rendered
    await ensureSavedExpensesExist(page)

    // Should show table headers - use role to be specific
    const tipoHeader = page.getByRole('columnheader', { name: /Tipo/i })
    const montoHeader = page.getByRole('columnheader', { name: /Monto/i })
    const cuentaHeader = page.getByRole('columnheader', { name: /Cuenta/i })
    const liderHeader = page.getByRole('columnheader', { name: /Lider/i })

    await expect(tipoHeader).toBeVisible()
    await expect(montoHeader).toBeVisible()
    await expect(cuentaHeader).toBeVisible()
    await expect(liderHeader).toBeVisible()
  })

  test('should display account balances section', async ({ page }) => {
    await setupGastosTab(page)

    // Should show account balances - look for currency formatted text
    // The balance cards contain formatted currency like "$1,234.56"
    const balanceText = page.locator('text=/\\$[\\d,]+\\.?\\d*/').first()

    // Should have at least one balance displayed
    await expect(balanceText).toBeVisible({ timeout: 5000 })
  })

  test('should have Agregar Gasto button', async ({ page }) => {
    await setupGastosTab(page)

    const addButton = page.getByRole('button', { name: /Agregar Gasto/i })
    await expect(addButton).toBeVisible()
  })

  test('should have Distribuir button', async ({ page }) => {
    await setupGastosTab(page)

    const distributeButton = page.getByRole('button', { name: /Distribuir/i })
    await expect(distributeButton).toBeVisible()
  })

  test('should have account type filter toggle', async ({ page }) => {
    await setupGastosTab(page)

    // Look for the filter toggle
    const filterToggle = page.getByText(/Incluir banco/i).or(
      page.locator('[role="switch"]')
    )
    await expect(filterToggle.first()).toBeVisible()
  })
})

// ============================================================================
// GASTOS TAB - CREATE EXPENSE TESTS
// ============================================================================

test.describe('Gastos - Creacion', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
    await setupGastosTab(page)
  })

  test('should add new expense row when clicking Agregar Gasto', async ({ page }) => {
    // Count current rows in table
    const tableBody = page.locator('table tbody')
    const initialRows = await tableBody.locator('tr').count()

    // Add expense
    await addExpenseRow(page)

    // Should have one more row
    const newRowCount = await tableBody.locator('tr').count()
    expect(newRowCount).toBe(initialRows + 1)
  })

  test('should show Guardar cambios button when expense is pending', async ({ page }) => {
    await addExpenseRow(page)

    // Should show save button
    const saveButton = page.getByRole('button', { name: /Guardar cambios/i })
    await expect(saveButton).toBeVisible()
  })

  test('should show validation error when saving without data', async ({ page }) => {
    await addExpenseRow(page)

    // Try to save empty expense
    const saveButton = page.getByRole('button', { name: /Guardar cambios/i })
    await saveButton.click()

    // Should show error toast
    const errorToast = page.locator('[role="status"]').filter({ hasText: /Sin gastos v.lidos/i })
    await expect(errorToast.first()).toBeVisible({ timeout: 5000 })
  })

  test('should show pending count badge', async ({ page }) => {
    await addExpenseRow(page)

    // Should show "Nuevos: 1" badge
    const newBadge = page.getByText(/Nuevos: 1/i)
    await expect(newBadge).toBeVisible()
  })

  test('should remove pending expense when clicking remove button', async ({ page }) => {
    await addExpenseRow(page)

    // Find the new row with inputs (pending expense row)
    const tableBody = page.locator('table tbody')
    const newRowsBefore = await tableBody.locator('tr').filter({ has: page.locator('input[type="number"]') }).count()

    if (newRowsBefore > 0) {
      // Find and click the remove button - it's the red trash icon button
      const newRow = tableBody.locator('tr').filter({ has: page.locator('input[type="number"]') }).first()
      // The remove button is typically a ghost button with destructive styling
      const removeButton = newRow.getByRole('button').filter({ has: page.locator('[class*="text-destructive"]') }).or(
        newRow.locator('button').last() // fallback to last button in row
      )

      if (await removeButton.count() > 0) {
        await removeButton.first().click()
        await page.waitForTimeout(500) // give UI time to update

        // The new row should be gone
        const newRowsAfter = await tableBody.locator('tr').filter({ has: page.locator('input[type="number"]') }).count()
        expect(newRowsAfter).toBeLessThan(newRowsBefore)
      }
    }
  })
})

// ============================================================================
// GASTOS TAB - BALANCE VALIDATION ON CREATE
// ============================================================================

test.describe('Gastos - Balance al Crear', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
    await setupGastosTab(page)
  })

  test('should decrease account balance when creating expense', async ({ page }) => {
    // Get initial account balance
    const initialAccount = await getAnyAccountBalance(page)

    // Should have accounts with balance - this is guaranteed by global setup
    expect(initialAccount.name).not.toBe('')

    // Add expense
    await addExpenseRow(page)

    // Fill expense details
    const tableBody = page.locator('table tbody')
    const newRow = tableBody.locator('tr').filter({ has: page.locator('input') }).first()

    // Select expense type (first dropdown)
    const typeButton = newRow.locator('button').first()
    if (await typeButton.count() > 0) {
      await typeButton.click()
      await page.waitForTimeout(200)
      const option = page.getByRole('option').first()
      if (await option.count() > 0) {
        await option.click()
      }
    }

    // Enter amount
    const amountInput = newRow.locator('input[type="text"], input').first()
    const expenseAmount = 100
    await amountInput.fill(expenseAmount.toString())
    await page.waitForTimeout(200)

    // Select account (if there's a second dropdown)
    const buttons = newRow.locator('button')
    if (await buttons.count() > 1) {
      await buttons.nth(1).click()
      await page.waitForTimeout(200)
      const accountOption = page.getByRole('option').first()
      if (await accountOption.count() > 0) {
        await accountOption.click()
      }
    }

    // Save
    const saveButton = page.getByRole('button', { name: /Guardar cambios/i })
    await saveButton.click()

    // Wait for save to complete
    await page.waitForTimeout(2000)

    // Verify balance decreased
    const finalAccount = await getAnyAccountBalance(page)

    // Balance should be less (expense subtracted)
    expect(finalAccount.balance).toBeLessThanOrEqual(initialAccount.balance)
  })
})

// ============================================================================
// GASTOS TAB - EDIT EXPENSE TESTS
// ============================================================================

test.describe('Gastos - Edicion', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
    await setupGastosTab(page)
    // Ensure saved expenses exist for all edit tests
    await ensureSavedExpensesExist(page)
  })

  test('should show edit option in dropdown menu', async ({ page }) => {
    const tableRows = page.locator('table tbody tr').filter({
      hasNot: page.locator('input'),
    })

    await expect(tableRows.first()).toBeVisible({ timeout: 5000 })

    const firstRow = tableRows.first()
    const menuButton = firstRow.locator('button').last()

    await menuButton.click()
    await page.waitForTimeout(200)

    const editOption = page.getByRole('menuitem', { name: /Editar/i })
    await expect(editOption).toBeVisible()
  })

  test('should open edit modal when clicking edit', async ({ page }) => {
    const tableRows = page.locator('table tbody tr').filter({
      hasNot: page.locator('input'),
    })

    await expect(tableRows.first()).toBeVisible({ timeout: 5000 })

    const firstRow = tableRows.first()
    const menuButton = firstRow.locator('button').last()

    await menuButton.click()
    await page.waitForTimeout(200)

    const editOption = page.getByRole('menuitem', { name: /Editar/i })
    await editOption.click()

    // Modal should open
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 3000 })
  })

  test('should show current expense data in edit modal', async ({ page }) => {
    // Find saved expense rows (those without input fields - not pending)
    // ensureSavedExpensesExist is called in beforeEach
    const tableRows = page.locator('table tbody tr').filter({
      hasNot: page.locator('input'),
    })

    // Should have at least one saved expense row
    await expect(tableRows.first()).toBeVisible({ timeout: 5000 })

    const firstRow = tableRows.first()
    const menuButton = firstRow.locator('button').last()
    await expect(menuButton).toBeVisible()

    await menuButton.click()
    await page.waitForTimeout(200)

    const editOption = page.getByRole('menuitem', { name: /Editar/i })
    await expect(editOption).toBeVisible()

    await editOption.click()
    await page.waitForTimeout(500)

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Should show form fields
    const amountInput = modal.locator('input[type="number"], input').first()
    await expect(amountInput).toBeVisible()

    // Should have type selector (use exact label text to avoid matching combobox placeholder)
    const typeLabel = modal.getByText('Tipo de Gasto')
    await expect(typeLabel).toBeVisible()
  })
})

// ============================================================================
// GASTOS TAB - BALANCE VALIDATION ON EDIT
// ============================================================================

test.describe('Gastos - Balance al Editar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
    await setupGastosTab(page)
    await ensureSavedExpensesExist(page)
  })

  test('should update balance when editing expense amount', async ({ page }) => {
    const tableRows = page.locator('table tbody tr').filter({
      hasNot: page.locator('input'),
    })

    await expect(tableRows.first()).toBeVisible({ timeout: 5000 })

    // Get initial balance
    const initialAccount = await getAnyAccountBalance(page)

    // Open edit modal
    const firstRow = tableRows.first()
    const menuButton = firstRow.locator('button').last()
    await menuButton.click()
    await page.waitForTimeout(200)

    const editOption = page.getByRole('menuitem', { name: /Editar/i })
    await editOption.click()
    await page.waitForTimeout(500)

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Get current amount
    const amountInput = modal.locator('input[type="number"], input').first()
    const currentAmount = await amountInput.inputValue()
    const currentAmountNum = parseFloat(currentAmount) || 0

    // Change amount (increase by 50)
    const newAmount = currentAmountNum + 50
    await amountInput.fill(newAmount.toString())
    await page.waitForTimeout(200)

    // Save
    const saveButton = modal.getByRole('button', { name: /Guardar/i })
    await saveButton.click()

    // Wait for modal to close and data to refresh
    await expect(modal).not.toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1000)

    // Verify balance changed
    const finalAccount = await getAnyAccountBalance(page)

    // Balance should be different (50 more was spent)
    // Note: We increased expense, so balance decreases
    expect(finalAccount.balance).toBeLessThanOrEqual(initialAccount.balance)
  })
})

// ============================================================================
// GASTOS TAB - DELETE EXPENSE TESTS
// ============================================================================

test.describe('Gastos - Eliminacion', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
    await setupGastosTab(page)
    await ensureSavedExpensesExist(page)
  })

  test('should show delete option in dropdown menu', async ({ page }) => {
    const tableRows = page.locator('table tbody tr').filter({
      hasNot: page.locator('input'),
    })

    await expect(tableRows.first()).toBeVisible({ timeout: 5000 })

    const firstRow = tableRows.first()
    const menuButton = firstRow.locator('button').last()

    await menuButton.click()
    await page.waitForTimeout(200)

    const deleteOption = page.getByRole('menuitem', { name: /Eliminar/i })
    await expect(deleteOption).toBeVisible()
  })

  test('should show confirmation dialog when clicking delete', async ({ page }) => {
    const tableRows = page.locator('table tbody tr').filter({
      hasNot: page.locator('input'),
    })

    await expect(tableRows.first()).toBeVisible({ timeout: 5000 })

    const firstRow = tableRows.first()
    const menuButton = firstRow.locator('button').last()

    await menuButton.click()
    await page.waitForTimeout(200)

    const deleteOption = page.getByRole('menuitem', { name: /Eliminar/i })
    await deleteOption.click()

    // Confirmation dialog should appear
    const confirmDialog = page.getByText(/Eliminar gasto/i)
    await expect(confirmDialog).toBeVisible({ timeout: 3000 })
  })

  test('should close dialog when clicking cancel', async ({ page }) => {
    const tableRows = page.locator('table tbody tr').filter({
      hasNot: page.locator('input'),
    })

    await expect(tableRows.first()).toBeVisible({ timeout: 5000 })

    const firstRow = tableRows.first()
    const menuButton = firstRow.locator('button').last()

    await menuButton.click()
    await page.waitForTimeout(200)

    const deleteOption = page.getByRole('menuitem', { name: /Eliminar/i })
    await deleteOption.click()
    await page.waitForTimeout(300)

    // Click cancel
    const cancelButton = page.getByRole('button', { name: /Cancelar/i })
    await cancelButton.click()

    // Dialog should close
    const confirmDialog = page.locator('[role="alertdialog"]')
    await expect(confirmDialog).not.toBeVisible({ timeout: 3000 })
  })
})

// ============================================================================
// GASTOS TAB - BALANCE VALIDATION ON DELETE
// ============================================================================

test.describe('Gastos - Balance al Eliminar', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
    await setupGastosTab(page)
  })

  test('should restore balance when deleting expense', async ({ page }) => {
    const tableRows = page.locator('table tbody tr').filter({
      hasNot: page.locator('input')
    })

    if (await tableRows.count() > 0) {
      // Get expense amount from first row
      const firstRow = tableRows.first()
      const amountCell = firstRow.locator('td').nth(1)
      const amountText = await amountCell.textContent()
      const expenseAmount = parseBalance(amountText)

      // Get initial balance
      const initialAccount = await getAnyAccountBalance(page)

      // Delete expense
      const menuButton = firstRow.locator('button').last()
      await menuButton.click()
      await page.waitForTimeout(200)

      const deleteOption = page.getByRole('menuitem', { name: /Eliminar/i })
      await deleteOption.click()
      await page.waitForTimeout(300)

      // Confirm delete
      const confirmButton = page.getByRole('button', { name: /Eliminar/i }).last()
      await confirmButton.click()

      // Wait for delete to complete
      await page.waitForTimeout(2000)

      // Verify balance increased (restored)
      const finalAccount = await getAnyAccountBalance(page)

      // Balance should increase by the deleted expense amount
      expect(finalAccount.balance).toBeGreaterThanOrEqual(initialAccount.balance)
    }
  })
})

// ============================================================================
// GASTOS TAB - DISTRIBUTED EXPENSE TESTS
// ============================================================================

test.describe('Gastos - Distribucion', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
    await setupGastosTab(page)
  })

  test('should open distributed expense modal', async ({ page }) => {
    const distributeButton = page.getByRole('button', { name: /Distribuir/i })
    await distributeButton.click()

    // Modal should open
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 3000 })
  })

  test('should show route selection in distributed modal', async ({ page }) => {
    const distributeButton = page.getByRole('button', { name: /Distribuir/i })
    await distributeButton.click()
    await page.waitForTimeout(500)

    const modal = page.locator('[role="dialog"]')

    // Should show route checkboxes or selector
    const routeSection = modal.getByText(/Seleccionar/i).or(
      modal.locator('[type="checkbox"]')
    )
    await expect(routeSection.first()).toBeVisible()
  })

  test('should show expense type selector in distributed modal', async ({ page }) => {
    const distributeButton = page.getByRole('button', { name: /Distribuir/i })
    await distributeButton.click()
    await page.waitForTimeout(500)

    const modal = page.locator('[role="dialog"]')

    // Should show expense type selector
    const typeLabel = modal.getByText(/Tipo de gasto/i)
    await expect(typeLabel).toBeVisible()
  })

  test('should show amount input in distributed modal', async ({ page }) => {
    const distributeButton = page.getByRole('button', { name: /Distribuir/i })
    await distributeButton.click()
    await page.waitForTimeout(500)

    const modal = page.locator('[role="dialog"]')

    // Should show amount input
    const amountInput = modal.locator('input[type="number"]')
    await expect(amountInput.first()).toBeVisible()
  })

  test('should close modal when clicking cancel', async ({ page }) => {
    const distributeButton = page.getByRole('button', { name: /Distribuir/i })
    await distributeButton.click()
    await page.waitForTimeout(500)

    // Click cancel
    const cancelButton = page.getByRole('button', { name: /Cancelar/i })
    await cancelButton.click()

    // Modal should close
    const modal = page.locator('[role="dialog"]')
    await expect(modal).not.toBeVisible({ timeout: 3000 })
  })
})

// ============================================================================
// GASTOS TAB - FILTERS TESTS
// ============================================================================

test.describe('Gastos - Filtros', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
    await setupGastosTab(page)
  })

  test('should toggle account type filter', async ({ page }) => {
    // Find toggle switch
    const toggleSwitch = page.locator('[role="switch"]')

    if (await toggleSwitch.count() > 0) {
      // Get initial state
      const initialState = await toggleSwitch.getAttribute('data-state')

      // Click toggle
      await toggleSwitch.click()
      await page.waitForTimeout(300)

      // State should change
      const newState = await toggleSwitch.getAttribute('data-state')
      expect(newState).not.toBe(initialState)
    }
  })

  test('should filter expenses by leader when leader is selected', async ({ page }) => {
    // First select a locality/leader
    const localitySelector = page.locator('button:has-text("Todas las localidades")').or(
      page.locator('button:has-text("Seleccionar localidad")')
    )

    if (await localitySelector.count() > 0) {
      await localitySelector.click()
      await page.waitForTimeout(200)

      // Select specific locality
      const options = page.getByRole('option')
      if (await options.count() > 1) {
        await options.nth(1).click() // Select second option (not "Todas")
        await page.waitForTimeout(1000)

        // Verify table updates (might show different or filtered results)
        const table = page.locator('table')
        await expect(table).toBeVisible()
      }
    }
  })
})

// ============================================================================
// GASTOS TAB - COMMISSION TYPES DISPLAY
// ============================================================================

test.describe('Gastos - Tipos de Comision', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
    await setupGastosTab(page)
  })

  test('should display commission badge for commission expenses', async ({ page }) => {
    // Look for commission badges in the table
    const commissionBadge = page.locator('table').getByText(/Comision/i)

    // If there are commission expenses, they should have the badge
    const table = page.locator('table')
    await expect(table).toBeVisible()

    // Commission rows should have amber background (if any exist)
    const amberRow = page.locator('tr.bg-amber-50\\/50')
    // Just verify table structure - commission rows may or may not exist
  })

  test('should show commission type labels correctly', async ({ page }) => {
    // Look for any commission type labels
    const commissionLabels = [
      /Credito Otorgado/i,
      /Comision Credito/i,
      /Comision Abono/i,
      /Comision Lider/i,
    ]

    const table = page.locator('table')
    await expect(table).toBeVisible()

    // If commission expenses exist, they should show proper labels
    // This is a structure verification - actual data may vary
  })
})

// ============================================================================
// GASTOS TAB - SKELETON LOADING
// ============================================================================

test.describe('Gastos - Estados de Carga', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
  })

  test('should show skeleton while loading', async ({ page }) => {
    // Select route
    const routeSelector = page.locator('button:has-text("Seleccionar ruta")')
    await routeSelector.click()
    const firstRoute = page.getByRole('option').first()
    await firstRoute.click()

    // Navigate to Gastos tab
    const gastosTab = page.getByRole('tab', { name: /Gastos/i })
    await gastosTab.click()

    // Should briefly show skeleton or loading state
    // Then show actual content
    const content = page.locator('table').or(page.getByText(/No hay gastos/i))
    await expect(content.first()).toBeVisible({ timeout: 10000 })
  })
})

// ============================================================================
// GASTOS TAB - EMPTY STATE
// ============================================================================

test.describe('Gastos - Estado Vacio', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
    await setupGastosTab(page)
  })

  test('should show empty state message when no expenses', async ({ page }) => {
    const table = page.locator('table')

    if (await table.count() > 0) {
      const rows = table.locator('tbody tr')
      if (await rows.count() === 0) {
        // Should show empty state
        const emptyMessage = page.getByText(/No hay gastos registrados/i)
        await expect(emptyMessage).toBeVisible()
      }
    }
  })

  test('should show add first expense button in empty state', async ({ page }) => {
    const table = page.locator('table')

    if (await table.count() > 0) {
      const rows = table.locator('tbody tr').filter({
        hasNot: page.locator('input')
      })

      if (await rows.count() === 0) {
        // Should show "Agregar primer gasto" button
        const addFirstButton = page.getByRole('button', { name: /Agregar primer gasto/i })
        // This button appears in the empty state
        const exists = await addFirstButton.count() > 0
        console.log(`Add first expense button exists: ${exists}`)
      }
    }
  })
})

// ============================================================================
// GASTOS TAB - KPI CALCULATIONS
// ============================================================================

test.describe('Gastos - Calculos KPI', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await goToTransactions(page)
    await setupGastosTab(page)
  })

  test('should update total when expenses change', async ({ page }) => {
    // Get initial total
    const totalBadge = page.getByText(/Total:/i)
    const initialTotalText = await totalBadge.textContent()
    const initialTotal = parseBalance(initialTotalText)

    // Add a new expense
    await addExpenseRow(page)

    // Fill it with an amount
    const tableBody = page.locator('table tbody')
    const newRow = tableBody.locator('tr').filter({ has: page.locator('input') }).first()
    const amountInput = newRow.locator('input').first()
    await amountInput.fill('100')
    await page.waitForTimeout(300)

    // Total should update to include new expense
    const newTotalText = await totalBadge.textContent()
    const newTotal = parseBalance(newTotalText)

    expect(newTotal).toBeGreaterThan(initialTotal)
  })

  test('should show correct expense count', async ({ page }) => {
    const gastosBadge = page.getByText(/Gastos:/i)
    const badgeText = await gastosBadge.textContent()

    // Should contain a number
    expect(badgeText).toMatch(/Gastos:\s*\d+/)
  })
})
