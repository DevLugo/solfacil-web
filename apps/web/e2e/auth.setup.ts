import { test as setup, expect } from '@playwright/test'
import path from 'path'

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'elugo.isi@gmail.com',
  password: process.env.TEST_USER_PASSWORD || 'test1234',
}

const authFile = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Fill login form
  await page.locator('input#email').fill(TEST_USER.email)
  await page.locator('input#password').fill(TEST_USER.password)

  // Click login button
  await page.getByRole('button', { name: 'Ingresar' }).click()

  // Wait for successful login - dashboard heading appears
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 15000 })

  // Verify we're logged in
  await expect(page).toHaveURL(/dashboard|transacciones/)

  // Save authentication state
  await page.context().storageState({ path: authFile })
})
