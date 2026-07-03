# YourStore — Enterprise Ecommerce Platform

Production-grade Next.js ecommerce platform with CMS-driven storefront and admin dashboard.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui + Framer Motion
- TanStack Query + Zustand
- MongoDB Atlas + Mongoose
- JWT Authentication + RBAC

## Getting Started

1. Copy environment variables:

```bash
cp .env.local.example .env.local
```

2. Set your MongoDB Atlas connection string and JWT secrets in `.env.local`.

3. Seed the database:

```bash
npm run seed
```

4. Start the dev server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Default Admin Credentials

- Email: `admin@yourstore.com`
- Password: `Admin123!` (or value of `SEED_ADMIN_PASSWORD`)

Admin dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)

## Atlas Search Setup

Create an Atlas Search index named `products_search` on the `products` collection, or run:

```bash
npm run setup:search
```

The app falls back to MongoDB text search if Atlas Search is unavailable.

## MongoDB MCP Plugin

For agent-assisted development, configure `MDB_MCP_CONNECTION_STRING` in your shell profile. See `.env.local.example` for details.

## Project Structure

- `src/app/(storefront)/` — Public shop pages
- `src/app/(admin)/admin/` — Admin dashboard
- `src/app/(auth)/` — Login & registration
- `src/app/api/v1/` — REST API routes
- `src/models/` — Mongoose models
- `scripts/seed.ts` — Database seed script
