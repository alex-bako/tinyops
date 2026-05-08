# TinyOps

TinyOps is a pnpm monorepo scaffold for the AI client memory and operations
platform described in [docs/PRD.md](docs/PRD.md).

## Stack

- `apps/web`: Next.js App Router, React 19, TypeScript, Tailwind CSS v4
- `packages/ui`: shared shadcn/ui components
- `supabase`: Supabase local backend config, migrations, seed, and edge functions
- Turborepo for workspace scripts

## Development

Install dependencies:

```bash
pnpm install
```

Start the web app:

```bash
pnpm dev
```

Start local Supabase:

```bash
pnpm supabase:start
pnpm supabase:status
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and use the local anon
key from `pnpm supabase:status`.

## Adding components

To add shadcn components, run this from the repository root:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```
