# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (PWA is disabled in dev mode)
pnpm dev

# Production build (uses webpack, not Turbopack - required for next-pwa)
pnpm build

# Lint
pnpm lint
```

No test suite is configured. The package manager is **pnpm** (not npm).

## Environment

Create `.env.local` with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

Server-side requests also read `API_URL` (internal network URL) with fallback to `NEXT_PUBLIC_API_URL`.

## Architecture

**Grupo Zenit** is a Next.js 16 PWA for managing daily reports on solar photovoltaic installation projects. The app is Spanish-language throughout (UI, variable names, comments).

### Auth & Multi-tenancy

- **Clerk** handles authentication and multi-tenancy via Organizations.
- Each user must belong to a Clerk Organization (`orgId`). The organization maps to a company in the backend.
- `OrganizationProvider` (`components/providers/organization-provider.tsx`) auto-activates the user's first organization if none is active.
- `ClerkApiConfig` (`lib/api/clerk-config.tsx`) injects `getToken` into the API client singleton at app startup.
- Onboarding is complete when the org has at least one project. `app/page.tsx` is the onboarding gate: routes to `/tablero` if ready, shows `FirstProjectModal` for org admins, or shows error states for non-admins.

### Data Flow

Initial data is loaded in the **root Server Component** (`app/layout.tsx`) via `lib/api/server.ts` using Clerk's server-side `auth()`. This pre-populates `AppProvider` to avoid client-side waterfalls.

`AppContext` (`lib/contexts/AppContext.tsx`) is the single global state store (React Context + useState). It holds company, projects, team, machinery, baselines, and dashboard summary. Convenience hooks are exported from the same file: `useProjects`, `useCompany`, `useTeam`, `useMachinery`, `useSelectedProject`.

### API Client

`lib/api/client.ts` is a singleton `ApiClient` class. All requests go through `resilientFetch` from `lib/api/resilience.ts`, which combines:
- **Circuit Breaker**: opens after 5 failures, resets after 60s
- **Retry with exponential backoff**: 3 retries for GET, 1 for mutations

The client auto-attaches Clerk Bearer tokens. POST/PUT/PATCH mutations are not retried.

Domain-specific API services are in `lib/api/`: `company.ts`, `projects.ts`, `team.ts`, `machinery.ts`, `reports.ts`, `baselines.ts`, `dashboard.ts`, `organization.ts`. All export from `lib/api/index.ts`.

### Routing (App Router)

```
app/
  page.tsx                  # Onboarding gate / redirect
  (dashboard)/              # Route group — protected layout
    layout.tsx              # Auth guard; offline Clerk bypass after 2s
    tablero/page.tsx        # Dashboard / KPI overview
    reporte/page.tsx        # Daily report form
    avances/                # Project progress
    maquinaria/             # Machinery management
    configuracion/          # Settings
  offline/page.tsx          # PWA offline fallback page
  sign-in/                  # Clerk sign-in
```

The `(dashboard)/layout.tsx` redirects unauthenticated users and those without an org/project. When **offline**, it bypasses Clerk's auth check after a 2-second timeout to allow the cached PWA session to render.

### Offline / PWA

- `@ducanh2912/next-pwa` with Workbox. PWA is **disabled in development**.
- **Build must use `--webpack`** (`pnpm build`). The PWA plugin is incompatible with Turbopack.
- `lib/offline/db.ts`: Dexie (IndexedDB) database `ZenitOfflineDB` stores pending reports in a `pendingReports` table.
- `lib/offline/sync.ts`: syncs pending reports to the API when back online.
- `lib/hooks/useOfflineReports.ts`: wraps `useReports` with offline-aware `createReport` — queues locally when offline, syncs on reconnect.
- `lib/hooks/useOfflineStatus.ts`: tracks `navigator.onLine` and pending report count.
- `OfflineIndicator` component triggers sync with a delay (to let Clerk renew its token) after reconnection.

### Business Logic

All domain constants are in `lib/constants/`:
- `activities.ts`: `ACTIVITY_CATEGORIES` (hincas, trackers, módulos, obraElectrica, ensayos, inversores, cts, preComisionamiento, otras) and `BASELINE_ACTIVITY_MAPPING` (maps report activities to baseline variables).
- `weights.ts`: `PROJECT_TOTAL_PROGRESS_WEIGHTS` defines the 7 weighted activities for overall project progress (Hincado 15%, Trackers 20%, Módulos 10%, Cable BT/AC 25%, Cable BT/CC 20%, Cable MT 5%, Inversores 5%). Also exports `calculateTRIR` and `calculateLTIR` (safety metrics using 200,000-hour factor).

Calculation logic lives in `lib/utils/calculations.ts`.

### UI Components

Uses shadcn/ui (Radix UI primitives + Tailwind). Component config is in `components.json`. All shadcn components are in `components/ui/`. Custom app components are organized in `components/forms/`, `components/layout/`, `components/modals/`, `components/icons/`, `components/offline/`, `components/machinery/`.

The app uses Geist Sans/Mono fonts and a CSS variable `--viewport-height` for correct mobile viewport height (injected inline in `<head>`).

### Backend Contract

The backend is a separate FastAPI service (not in this repo). Critical conventions:
- API responses must be **camelCase** (not snake_case)
- Dates in **ISO 8601**
- UUIDs as **strings**
- Backend docs are in `docs/API_BACKEND.md`, `docs/BACKEND_SETUP.md`, `docs/FRONTEND.md`

## API Client — Error Handling

`ApiError` shape: `{ message: string, code: string, details?: unknown }` where `code` is the HTTP status as a string. To check for a 404:
```typescript
} catch (error: any) {
  if (error?.code === '404') return null;
  throw error;
}
```
The resilience layer retries GETs up to 3 times but **never retries POST/PUT/PATCH**.

`apiClient.get(endpoint, params)` — second argument becomes URL query params (key-value object).

## Reports — Key Patterns

### Transport format
`reportsService.create()` and `update()` always send **multipart/form-data**: the JSON payload goes in a `data` field (`formData.append('data', JSON.stringify(...))`), images as separate `images` fields. Never send raw JSON to these endpoints.

### Getting the latest report
```typescript
const lastReport = await reportsService.getLatestByProject(projectId)
// Returns DailyReport | null — uses GET /reports/latest?projectId=...
// Returns null on 404 (no prior reports for that project)
```

### Hooks: useReports vs useOfflineReports
- **`useOfflineReports`**: use in forms that create/edit reports. Offline-aware: queues to IndexedDB when offline, syncs on reconnect.
- **`useReports`**: use in read-only views (history, dashboard). No offline queue.

## Daily Report Form — Gotchas

### Local Activity type (not from lib/types)
`components/forms/daily-report-form.tsx` defines its own local `Activity` interface where **all numeric fields are strings** (`quantity`, `workers`). They are parsed to numbers only in `prepareReportData()` before submission. Do not use `ActivityEntry` from `lib/types` directly in form state.

### ActivityForm re-initialization (critical)
`ActivityForm` initializes its local state (`selectedCategory`, `selectedSubActivity`, `selectedComponent`) via a `useEffect` that watches **`activity.id`**, not the field values. When programmatically setting activity data (e.g. autocomplete from last report), always generate **new random IDs** for each activity so the effect fires and the UI re-initializes:
```typescript
const mappedActivities = lastReport.activities.map(a => ({
  id: Math.random().toString(36).substr(2, 9), // new ID = triggers useEffect in ActivityForm
  ...
}))
setActivities(mappedActivities)
```

### predefinedActivities (activity-form.tsx)
Source of truth for valid categories in the form UI: `hincas | trackers | modulos | calidad | obraElectrica | ensayos | inversores | cts | otras`. Each entry defines `subActivities`, optional `components`, and `unit` or `getUnit(subActivity)`. The description and unit fields are auto-generated from the selected category + sub-activity + component.

### Form entry point
`app/(dashboard)/reporte/page.tsx` only renders `<ReportHistory />`. The "Nuevo Reporte" form is toggled **inside** `ReportHistory` via `showNewReportForm` state. `DailyReportForm` receives `existingReport` (null = create, object = edit) and `onBack` callback.

## Offline Infrastructure

These files **must exist** or the app fails to compile:
- `lib/offline/db.ts` — Dexie DB (`ZenitOfflineDB`), `OfflinePendingReport` type, helpers `generateOfflineId`, `filesToOfflineImages`, `offlineImagesToFiles`
- `lib/offline/sync.ts` — exports `syncPendingReports()` and `getPendingCount()`; called by `useOfflineStatus` and `OfflineIndicator`
- `components/offline/OfflineIndicator.tsx` — imported in `app/(dashboard)/layout.tsx`; shows offline banner and auto-syncs after 3 s delay on reconnect (delay lets Clerk renew the auth token before making authenticated API calls)

## Date Utilities

Always use `formatDateLocal(dateStr, options?)` from `lib/utils` for displaying dates. Avoid `new Date(dateStr)` directly on `YYYY-MM-DD` strings — it parses as UTC midnight and shifts the day in negative-offset timezones.
