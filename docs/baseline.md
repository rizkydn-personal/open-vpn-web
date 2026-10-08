# Baseline

Date: 2026-10-08 (Asia/Jakarta)
Branch: `audit/professional-polish` (existing branch retained because the working tree already contains uncommitted changes).

## Existing working tree

At the start, `README.md`, `PRODUCTION_SETUP.md`, `src/app/layout.tsx`, `src/components/Portal.tsx`, `src/lib/env.ts`, `src/lib/firestore.ts`, `src/lib/vpnApi.ts`, and `tests/e2e/portal.spec.ts` had pre-existing modifications. `task.md` was untracked. These changes were preserved.

## Checks before task changes

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | PASS | ESLint completed without reported issues. |
| `npm test` | PASS | 11 tests passed when rerun outside the sandbox. The first sandbox attempt failed with `spawn EPERM`. |
| `npm run test:integration` | PASS | 1 test passed when rerun outside the sandbox. The first sandbox attempt failed with `spawn EPERM`. |
| `npm run test:e2e` | FAIL | Build passed; 3 existing scenarios failed. The account POST returned 403 because the origin guard compared the browser origin against Next.js's internal URL. The API outage assertion expected a different heading. The browser server also read the workspace `.env.local` server list instead of the mock, so the run was not isolated. |
| `npm run test:security` | PASS | Client static bundle reported no server secret references. |
| `npm run check:contrast` | PASS | All configured color pairs met their thresholds. |
| `npm run build` | PASS | Production build passed when rerun outside the sandbox. The first sandbox attempt failed with `spawn EPERM`. |

## Repository map and quota flow

- `src/app/`: public pages, API routes, layout and metadata.
- `src/components/`: navigation, service list, account form, and portal UI.
- `src/lib/`: environment validation, upstream API, time, quota/rate limiting, request guard, and temporary account storage.
- `tests/`: Vitest unit/integration coverage and Playwright E2E coverage.
- `mock-api/`: local upstream API simulator.
- `scripts/`: standalone asset copy and security/contrast checks.

Quota reservation uses a Firestore transaction to read and increment `vpn_web_quota/{WIB-day}_{service}` atomically. A definite upstream failure releases the reservation in another transaction. An uncertain POST result (for example, a timeout after sending) deliberately retains the reservation to avoid releasing capacity for an account that may have been created. Process death after reservation has no reservation-expiry or reconciliation mechanism yet. The in-memory mode is per-process only.

## Browser and runtime observation

The initial E2E browser pass used production API configuration from `.env.local` and is recorded as an isolation failure above. The test harness has since been changed to point explicitly at the local mock, use memory quota, and avoid the workspace API configuration. No credentials from the `.env.local` file were displayed. After the UI changes, `tests/e2e/portal.spec.ts` checked the homepage, an available service page, terms, and privacy at 360px, 390px, 768px, and 1280px. All eight E2E scenarios passed; the responsive-page sweep found no horizontal overflow. Chromium screenshots at 360px and 1280px were reviewed during implementation; that review identified missing spacing between footer links, which was corrected and covered by the final E2E pass.
