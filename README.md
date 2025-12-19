# SoluFácil Web

Next.js frontend application for SoluFácil microloans management system.

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui
- Apollo GraphQL Client
- Playwright (E2E tests)

## Development

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your NEXT_PUBLIC_GRAPHQL_URL

# Start dev server
pnpm dev
```

App runs on `http://localhost:3000`

## Production Deployment

Deployed on Vercel.

See `vercel.json` for configuration.

## Environment Variables

Required:
- `NEXT_PUBLIC_GRAPHQL_URL` - API GraphQL endpoint
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name

See `.env.example` for full list.

## E2E Tests

```bash
# Run tests
pnpm test:e2e

# Run tests with UI
pnpm test:e2e:ui
```
