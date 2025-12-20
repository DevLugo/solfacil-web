import { GraphQLScalarType, Kind } from 'graphql'
import { DateTimeResolver, JSONResolver } from 'graphql-scalars'
import { Decimal } from 'decimal.js'

// Helper to check if value is a Decimal-like object (handles both decimal.js and Prisma.Decimal)
function isDecimalLike(value: unknown): value is { toString(): string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'toString' in value &&
    typeof (value as { toString: unknown }).toString === 'function' &&
    // Check for decimal-specific methods
    ('toFixed' in value || 'd' in value || 's' in value)
  )
}

// Custom Decimal scalar
export const DecimalScalar = new GraphQLScalarType({
  name: 'Decimal',
  description: 'Decimal custom scalar type for precise numeric calculations',
  serialize(value: unknown): string {
    if (value instanceof Decimal) {
      return value.toString()
    }
    // Handle Prisma.Decimal and other Decimal-like objects
    if (isDecimalLike(value)) {
      return value.toString()
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return new Decimal(value).toString()
    }
    throw new Error('Decimal can only serialize Decimal, string, or number values')
  },
  parseValue(value: unknown): Decimal {
    if (typeof value === 'string' || typeof value === 'number') {
      return new Decimal(value)
    }
    throw new Error('Decimal can only parse string or number values')
  },
  parseLiteral(ast): Decimal {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
      return new Decimal(ast.value)
    }
    throw new Error('Decimal can only parse string, int, or float values')
  },
})

// Custom Upload scalar for file uploads
export const UploadScalar = new GraphQLScalarType({
  name: 'Upload',
  description: 'The `Upload` scalar type represents a file upload.',
  parseValue(value: unknown) {
    return value
  },
  parseLiteral() {
    throw new Error('Upload literal unsupported')
  },
  serialize() {
    throw new Error('Upload serialization unsupported')
  },
})

// Export all scalars
export const scalars = {
  DateTime: DateTimeResolver,
  Decimal: DecimalScalar,
  JSON: JSONResolver,
  Upload: UploadScalar,
}
