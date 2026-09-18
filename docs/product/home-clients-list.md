# Home is the client list — feature PRD

Status: draft for acceptance · Planning run: `home-clients-list` · Parent PRD: [../PRD.md](../PRD.md) · Related: onboarding input reliability (both land a person on `/home`), [workspace invites](workspace-invites.md)

## Problem

The signed-in home screen shows almost nothing true. The greeting is a hardcoded string — "Good afternoon, Jamie", "Wednesday, May 8", "Eight clients need attention" — regardless of who signed in, what day it is, or how many clients the workspace holds. "Needs attention" and "This week" are literal arrays in the source. The four "Quick actions" buttons have no handlers and do nothing when clicked. Of seven sections on the page, three carry real data.

The one surface that *is* real and useful — every client in the workspace, filterable, openable — sits one click away behind a sidebar entry. So the first screen after signing in, after onboarding, and after accepting an invitation is a demo, and the useful screen is somewhere else.

The sidebar has the same problem in miniature: "Tasks" and the three "Pinned views" rows show counts that are always `0` for a real workspace and have no destination at all.

## Users

- **Owner signing in to work** (persona 5.1): opens TinyOps to find a person and act on them. Wants the client list, not a summary of numbers that were never computed.
- **Founder who just finished onboarding**: lands on `/home` with zero clients. Today they meet fabricated activity for a workspace that has none.
- **Invited member who just accepted** (persona 5.2, the [invites](workspace-invites.md) path): lands on `/home` in a workspace whose clients she has never seen. The list is what orients her.

## Success

- Everything on the home screen is either real data from the active workspace or a control that works. No hardcoded example values remain on a signed-in surface.
- Signing in puts the full client list on screen, with the search bar above it, in one page load and no extra click.
- Every sidebar row leads somewhere real.
- Typing in the one search bar at the top narrows the list under it; an exact match can be opened straight from the dropdown.
- A workspace with no clients yet is told so plainly and offered the two ways to add them, rather than being shown a filter message about rows that do not exist.

## Primary flow

1. A person signs in, finishes onboarding, or accepts an invitation. All three land on `/home`.
2. `/home` shows: a header naming the workspace and its real client count; the search bar; the status filter tabs with real counts, the cohort select, and Import / New client; then every client in the workspace, newest activity first.
3. They type `mari` in the search bar. The rows narrow to matching clients as they type. The dropdown offers to open an exact match directly.
4. They click a row (or press Enter on the dropdown match) and land on that client's profile at `/home/clients/<slug>`.
5. From the profile, the back link returns them to `/home`.

## Failure and recovery scenarios

- **Workspace with no clients** (fresh onboarding, or a member who just joined an empty workspace): the list area says the workspace has no clients yet and offers Import and New client. It does not say "No clients match these filters", because no filter is applied.
- **Search matches nothing**: the rows area says so and offers to clear the search, distinct from the empty-workspace case above.
- **An old `/home/clients` link** (bookmark, existing email, staging deep link): redirects to `/home`, which now shows that list. Nothing 404s.
- **Client list fails to load**: the page reports the failure rather than rendering an empty list that looks like an empty workspace.

## Requirements

Stable IDs. "Existing" means already implemented and covered by tests.

| ID | Requirement | Status |
|----|-------------|--------|
| HOME-1 | `/home` renders the full client list of the active workspace — the status filter tabs with real counts, the cohort select, and one row per client — as its main content. | New (relocation of an existing, working surface) |
| HOME-2 | The client search bar sits above the list on `/home` and stays the first interactive element on the page. | New (D1) |
| HOME-3 | Typing in that search bar narrows the rows in the list below it. The list and the search agree, because both read the same loaded rows. | New (D3) |
| HOME-4 | The search bar's dropdown offers what the list underneath cannot: opening an exact match directly, and the non-client actions it already carries. It never covers the rows it is narrowing. | New (D3) |
| HOME-5 | The clients toolbar's own "Filter by name or email" field is removed. One search input exists on the page. | New (D3) |
| HOME-6 | No hardcoded example data is rendered on `/home`: the "Needs attention" list, the "This week" tasks, the "Recently viewed" section, the four no-op "Quick actions" buttons, and the fabricated greeting all go. | New (D1) |
| HOME-7 | The `/home` header names the active workspace and its real client count. It states nothing that is not computed from the workspace. | New (D1) |
| HOME-8 | A workspace with zero clients gets a first-run empty state naming that fact and offering Import and New client — distinct from the "no rows match your search" state. | New |
| HOME-9 | `/home/clients` redirects to `/home`. The client profile route `/home/clients/<slug>` is unchanged, and every "back to all clients" link and breadcrumb points at `/home`. | New (A1) |
| HOME-10 | The sidebar's "Clients" entry is removed, because Home is now that destination. | New (D1) |
| HOME-11 | Every remaining sidebar entry has a real destination. "Tasks" and the "Pinned views" group — none of which has an `href`, and all of whose counts are always `0` for a real workspace — are removed. | New (D2) |
| HOME-12 | One navigation definition drives the sidebar. The unused second copy in `lib/navigation.ts` is not left behind to drift. | New (defect: two nav sources) |
| HOME-13 | Realtime client inserts and updates still refresh the list now that it renders on `/home`. | Existing (must not regress) |
| HOME-14 | The list stays usable at the workspace sizes the product targets (50–2,000 clients), keeping the existing row windowing. | Existing (must not regress) |
| HOME-15 | Client profiles, their data, and every other route are untouched by this feature. | Existing |

## Scope

In scope: HOME-1 through HOME-12, across `/home`, `/home/clients` and the sidebar.

Non-goals (explicit):

- **Building a real "Needs attention" summary.** The counts it showed — overdue follow-ups, drafts pending approval, flagged items, inactive participants — do not exist in the data model. Each needs a definition and a query. Deleting the fake version is this feature; computing a real one is a later milestone (D1's stated tradeoff).
- **Building Tasks or Pinned views.** Removing their dead nav rows is not a decision to drop the features; it is a decision not to advertise them before they exist. Each returns as one array entry when it ships (D2).
- Making the toolbar's "View", "Import" and "New client" buttons functional, beyond keeping them exactly as they are today.
- Any change to the client list's columns, sorting, filters, cohorts, or the client profile page.
- Server-side pagination of the client list. It is uncapped today by deliberate design (see the sourced facts) and stays that way.
- Changing what onboarding or the Join flow creates, or where they redirect.
- Workspace switcher, settings, and data-source surfaces.

## Constraints and sourced facts

Verified in the code on 2026-09-18:

- The home page's example data is literal: `ATTENTION` and `WEEK_TASKS` are exported arrays in [`app/(app)/home/_data.ts`](../../apps/web/app/%28app%29/home/_data.ts). The greeting strings "Wednesday, May 8 · Jamie's workspace" and "Good afternoon, Jamie. *Eight* clients need attention." are hardcoded in [`app/(app)/home/page.tsx`](../../apps/web/app/%28app%29/home/page.tsx). The four Quick-action `Button`s carry no `onClick` and no `href`.
- Real on `/home` today: `HomeSearch`, `recentClients` (`getRecentClients(5)`) and `homeSources`. Everything else on the page is fabricated.
- `/home/clients` is already the wanted surface: `ClientsPageClient` composes `ClientsToolbar` (status tabs with real counts, cohort select, Import, New client) and `ClientsTable` over `useClientListView`, with `ClientProfileRealtimeRefresh` and row windowing via `use-visible-window.ts`. Moving it is relocation, not reconstruction.
- `listClients` reads the `client_list_rows` scalar view with **no limit** — the comment records that reading the scalar view is what removed the old 500-row cap. So the browser already holds every client of the workspace, which is what makes HOME-3's "both read the same loaded rows" achievable.
- Consequently `searchClientsAction` (`app/(app)/home/actions.ts` → `searchClients`, capped at 8 and hitting the database per keystroke) is querying for rows the page already has. See A2.
- Two search inputs would otherwise coexist: `HomeSearch` (server-backed, navigates to a profile) and the `SearchField` inside `ClientsToolbar` (client-side, filters `filters.query`). HOME-5 resolves this.
- The sidebar renders `WORKSPACE_NAV_GROUPS` from [`features/workspaces/navigation.ts`](../../apps/web/features/workspaces/navigation.ts). Counts are injected by `buildSidebarNavGroups` → `withWorkspaceCount` from `usage.sidebarCounts`.
- Only `clients` is ever a real count: `features/workspaces/use-cases.ts:364` builds `sidebarCounts` as `{ ...EMPTY_WORKSPACE_USAGE.sidebarCounts, clients }`, so `tasks`, `march`, `feedback` and `dnc` are `0` for every real workspace. Non-zero values for them exist only in `features/workspaces/mock-data.ts`. None of those four nav items has an `href`.
- A **second**, divergent nav definition exists: `NAV_GROUPS` in [`lib/navigation.ts`](../../apps/web/lib/navigation.ts), with its own hardcoded counts (`clients: 142`, `tasks: 3`, `march: 47`…). It is referenced only by `lib/navigation.test.ts`. The same file's `APP_ROUTES` **is** live — it drives `deriveAppCrumbs` breadcrumbs, including the `Home > Clients > <name>` trail on a client profile.
- All three entry paths land on `/home`: `app/page.tsx:13`, `app/join/page.tsx:34` and `app/onboarding/page.tsx:36` redirect to `DEFAULT_SIGNED_IN_PATH`. A workspace with no clients therefore meets the list immediately, and today's only empty text is `CLIENT_LIST_EMPTY_MESSAGE = "No clients match these filters."` (`app/(app)/home/clients/_view-model.ts:28`) — wrong for that case, which is why HOME-8 exists.
- Tests are Vitest + Testing Library with jsdom. The suites this feature moves or breaks: `home-search.test.tsx`, `home-search-model.test.ts`, `clients-table.test.tsx`, `_view-model.test.ts`, `lib/navigation.test.ts`, `features/workspaces/view-models.test.ts`. There is no end-to-end browser framework in the repo.
- `_view-model.test.ts:93` asserts against the literal source path `app/(app)/home/clients/_view-model.ts`, so moving that file requires updating the assertion.

## User decisions

- **D1 (2026-09-18)**: Full replacement. `/home` becomes the client list: header, search bar, list. Every example-data section is deleted rather than kept or stubbed — "Needs attention", "This week", "Quick actions", and the fabricated greeting. "Recently viewed" goes too, because the full list is now on the same screen. Rejected: keeping the real Data-sources rail beside the list (it squeezes the table and is one sidebar click away), and rebuilding the summary with real queries now (a materially larger feature; see non-goals).
- **D2 (2026-09-18)**: Remove every dead sidebar entry, not just "Clients". "Tasks" and the whole "Pinned views" group go, leaving Home, Data sources and Settings — all of which lead somewhere. Accepted tradeoff, stated at the time of the decision: the visual placeholder for those unbuilt features disappears, and each will need its nav entry added back when it ships. Rejected: removing only "Clients" as literally asked, which would leave four dead rows reproducing in the sidebar exactly the problem being fixed on the home screen.
- **D3 (2026-09-18)**: One search bar, and it drives the list. The top bar filters the rows below as the person types; the toolbar's own filter field is removed; the dropdown narrows to what the list cannot do (jump to an exact match, plus its existing non-client actions). Accepted tradeoff, stated at the time of the decision: this is real work rather than pure relocation — the bar's query has to drive the table and the dropdown must not cover the rows being filtered — so it is its own slice. Rejected: keeping both inputs with distinct jobs (two search fields a few pixels apart), and dropping in-list text filtering entirely (unworkable at a few hundred clients).

## Proposed assumptions (not yet user-confirmed; treated as accepted unless objected to)

- **A1** `/home/clients` redirects to `/home` rather than being deleted outright, so existing bookmarks and any staging deep links keep working. `/home/clients/<slug>` is untouched; its breadcrumb becomes `Home > <client name>` and its back link points at `/home`.
- **A2** With every row already in the browser (uncapped `listClients`), the search bar filters and offers jumps from those loaded rows, and `searchClientsAction` is removed rather than kept as a second, capped, per-keystroke source of the same answer. If profiling at the top of the target range says otherwise, keeping it is a decision to raise at `aw-plan`, not now.
- **A3** The header reads as workspace identity plus the real client count (the shape the existing clients page already uses), not a greeting. No name, no date, no time of day — none of which the page currently knows.
- **A4** The example rows in `features/workspaces/mock-data.ts` stay as they are. They feed tests and the mock repository, not a signed-in surface, so HOME-6 does not reach them.
- **A5** `sidebarCounts` keeps its `tasks`, `march`, `feedback` and `dnc` keys for now; only the nav rows go. Removing the keys is a type change rippling into the mock data and its tests, for no user-visible gain.
- **A6** The client row's existing windowing (`use-visible-window.ts`) is what keeps HOME-14 true on `/home`; no new virtualization is introduced.

## Open decisions

None blocking. Deferred to implementation: the exact wording of the empty-workspace and no-match messages, and whether the dropdown sits over or beside the list when the query is short (both are constrained by HOME-4, not free).
