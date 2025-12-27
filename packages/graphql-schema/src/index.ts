// Export schema SDL
import { readFileSync } from 'fs'
import { join } from 'path'

// Use __dirname equivalent for CommonJS in ESM
const schemaPath = join(__dirname || process.cwd(), 'schema.graphql')
export const typeDefs = readFileSync(schemaPath, 'utf-8')

// Export scalars
export { scalars, DecimalScalar } from './scalars'

// Export generated types (will be available after running codegen)
export * from '../generated/types'
