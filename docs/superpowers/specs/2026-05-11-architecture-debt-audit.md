# Architecture Debt Audit - 2026-05-11

Scope: current uncommitted branch changes, with emphasis on React Doctor,
server-action boundaries, DDD/hexagonal seams, and recent UI architecture.

## Fixed In This Pass

- Client-list navigation now has view-model helpers for profile hrefs,
  transition names, and newly inserted rows. The table consumes those helpers
  instead of duplicating URL and animation strings.
- View-transition usage is isolated behind
  `apps/web/lib/view-transition-navigation.ts`; UI callers no longer touch the
  browser API directly.
- Shared floating-component motion classes live in `packages/ui/src/lib/motion.ts`
  and are covered by unit tests.
- App-only animation selectors moved from shared UI globals into
  `apps/web/app/motion.css`.
- Workspace and data-source server actions now return `not_authenticated`
  before constructing command applications when there is no Supabase app
  session/server context.
- Broad React Doctor cleanups removed dead route metadata/client boundaries,
  inaccessible labels, unstable keys, redundant Tailwind axes, render-time state
  sync, avoidable serial work, and unused local files.

## Accepted Warnings

These remain after the full React Doctor scan. Do not delete or parallelize them
without proving the domain contract first.

- `react-doctor/server-auth-actions`: false positive against the local Supabase
  boundary. Actions authenticate through `createServerSupabaseClient()` plus
  `readSupabaseAppProfileSession()` or `createDataSourceServerContext()` before
  building application services. `requestMagicLink` is intentionally public.
  Added tests cover unauthenticated workspace and data-source actions.
- `knip/types` and `knip/exports`: mostly generated database types, package-like
  domain/application exports, and test/support seams. Pruning these blindly would
  couple callers to file internals and make the hexagonal boundary worse. Next
  safe step is an explicit public-entrypoint/Knip configuration pass.
- `react-doctor/js-tosorted-immutable`: the shared TypeScript config currently
  targets `lib: ["es2022", ...]`, so `Array.prototype.toSorted` fails
  typecheck. Use clone-plus-sort until the repo explicitly raises the JS lib
  target and browser/runtime support expectations.
- `react-doctor/async-await-in-loop` in the sync worker and threaded IMAP sync:
  sequential by design. Job claiming, cursor movement, connection state, and
  rate limits are dependent operations.
- `react-doctor/async-parallel` in the IMAP connection tester: connect, list,
  and logout are one ordered resource lifecycle.
- `react-doctor/no-document-start-view-transition`: current React/Next setup does
  not expose a project-ready `<ViewTransition>` integration. The browser API is
  contained in a small adapter and tested through the list flow.

## Follow-Up Plan

1. Add a Knip configuration that marks generated Supabase types and intentional
   package/domain exports as public.
2. Split any remaining true unused domain exports only with local usage searches
   plus targeted tests.
3. Revisit the view-transition adapter when React/Next exposes a stable
   framework-level API in this app.
