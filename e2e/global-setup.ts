import { request } from '@playwright/test'

const API_URL = process.env.API_URL || 'http://localhost:4000/graphql'
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'elugo.isi@gmail.com',
  password: process.env.TEST_USER_PASSWORD || 'test1234',
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

async function globalSetup() {
  console.log('\n🔧 Running global E2E test setup...')

  const context = await request.newContext({
    baseURL: API_URL,
  })

  // 1. Authenticate
  console.log('  → Authenticating...')
  const loginResponse = await context.post('', {
    data: {
      query: `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            accessToken
            user { id email role }
          }
        }
      `,
      variables: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    },
  })

  const loginData: GraphQLResponse<{ login: { accessToken: string; user: { id: string; role: string } } }> =
    await loginResponse.json()

  if (loginData.errors || !loginData.data?.login) {
    console.error('❌ Login failed:', loginData.errors)
    throw new Error('Failed to authenticate for global setup')
  }

  const token = loginData.data.login.accessToken
  const userRole = loginData.data.login.user.role
  console.log(`  ✓ Authenticated as ${TEST_USER.email} (${userRole})`)

  // Helper function for authenticated GraphQL requests
  async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
    const response = await context.post('', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: { query, variables },
    })
    const result: GraphQLResponse<T> = await response.json()
    if (result.errors) {
      console.error('GraphQL Error:', result.errors[0].message)
      return null
    }
    return result.data || null
  }

  // 2. Verify routes exist
  console.log('  → Checking routes...')
  const routesData = await graphql<{ routes: Array<{ id: string; name: string }> }>(`
    query { routes { id name } }
  `)

  if (!routesData?.routes?.length) {
    console.error('❌ No routes found in database')
    throw new Error('Test setup requires at least one route')
  }
  console.log(`  ✓ Found ${routesData.routes.length} routes`)

  // 3. Verify localities exist
  console.log('  → Checking localities...')
  const locationsData = await graphql<{ locations: Array<{ id: string; name: string }> }>(`
    query { locations { id name } }
  `)

  if (!locationsData?.locations?.length) {
    console.error('❌ No locations found in database')
    throw new Error('Test setup requires at least one location')
  }
  console.log(`  ✓ Found ${locationsData.locations.length} locations`)

  // 4. Verify accounts exist
  console.log('  → Checking accounts...')
  const accountsData = await graphql<{ accounts: Array<{ id: string; name: string; accountBalance: string }> }>(`
    query { accounts { id name accountBalance } }
  `)

  if (!accountsData?.accounts?.length) {
    console.error('❌ No accounts found in database')
    throw new Error('Test setup requires at least one account')
  }

  // Check if at least one account has positive balance
  const hasPositiveBalance = accountsData.accounts.some(
    (acc) => parseFloat(acc.accountBalance) >= 100
  )
  if (!hasPositiveBalance) {
    console.warn('  ⚠ No accounts with balance >= $100 found. Some tests may fail.')
  }
  console.log(`  ✓ Found ${accountsData.accounts.length} accounts`)

  // 5. Verify loan types exist
  console.log('  → Checking loan types...')
  const loantypesData = await graphql<{ loantypes: Array<{ id: string; name: string }> }>(`
    query { loantypes { id name } }
  `)

  if (!loantypesData?.loantypes?.length) {
    console.error('❌ No loan types found in database')
    throw new Error('Test setup requires at least one loan type')
  }
  console.log(`  ✓ Found ${loantypesData.loantypes.length} loan types`)

  // 6. Verify active loans exist (for payment tests)
  console.log('  → Checking active loans...')
  const loansData = await graphql<{ loans: { totalCount: number } }>(`
    query {
      loans(status: ACTIVE, limit: 10) {
        totalCount
      }
    }
  `)

  if (!loansData?.loans?.totalCount) {
    console.warn('  ⚠ No active loans found. Payment tests may fail.')
  } else {
    console.log(`  ✓ Found ${loansData.loans.totalCount} active loans`)
  }

  // 7. Verify clients/borrowers exist using search
  console.log('  → Checking borrowers...')
  const borrowersData = await graphql<{ searchBorrowers: Array<{ id: string }> }>(`
    query { searchBorrowers(searchTerm: "a", limit: 5) { id } }
  `)

  if (!borrowersData?.searchBorrowers?.length) {
    console.warn('  ⚠ No borrowers found. Loan creation tests may fail.')
  } else {
    console.log(`  ✓ Found ${borrowersData.searchBorrowers.length}+ borrowers`)
  }

  // 8. Check for expenses (transactions of type EXPENSE)
  console.log('  → Checking expenses...')
  const expensesData = await graphql<{ transactions: { totalCount: number } }>(`
    query {
      transactions(type: EXPENSE, limit: 5) {
        totalCount
      }
    }
  `)

  if (!expensesData?.transactions?.totalCount) {
    console.log('  ℹ No expenses found. Tests will create them.')
  } else {
    console.log(`  ✓ Found ${expensesData.transactions.totalCount} expenses`)
  }

  await context.dispose()

  console.log('✅ Global setup complete!\n')
}

export default globalSetup
