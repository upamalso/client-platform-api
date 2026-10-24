# Client Platform API History

Read before making changes; update after every user exchange. Never store
credentials, tokens or personal customer information here.

## Resume Here

- Publication update: 2026-10-24 18:48 IST. User requested commits/pushes for
  all three repositories and supplied this backend's new remote:
  `https://github.com/upamalso/client-platform-api.git`. Git initialized on
  main; the README-only GitHub initial commit is preserved through a normal
  merge. All backend source/docs/tests are committed and pushed with HEAD
  verification; actual local `.env`, dependencies and generated files excluded.
- This is source publication, not a production backend deployment. Frontend
  production API activation remains disabled; existing connected Netlify sites
  may rebuild from the frontend pushes. Earlier no-commit/no-push statements
  below describe historical exchanges, not this authorized publication.
- Current frontend navigation uses permanent My Bookings and one state-aware
  Sign In/Sign Out header link. Account pages have no duplicate booking or
  logout controls. Latest frontend suites: original 20 tests, Ana Glow 22;
  backend 5 unit + 12 MySQL checks and all builds pass.

- Latest update: 2026-10-24 18:19 IST. Customer registration with mandatory
  Name/Email/Password and account-linked bookings/history is implemented in
  both websites. Sign In now supports CUSTOMER and OWNER roles. Register is
  `/register`, My Bookings is `/account/bookings`; guest booking stays public.
- Migration 002 adds user profiles and account-booking links without resetting
  existing data. Customer endpoints use session user ID with tenant/role/CSRF
  checks; never infer ownership from email or claim old guest bookings.
- Current verification: backend 5 unit + 12 MySQL checks, original frontend
  15 tests, Ana Glow 17 tests, all builds pass. Both local apps completed
  registration/sign-in/booking/history with synthetic data; screenshot and axe
  checks of customer views passed. Native pointer checks stalled in hidden tabs;
  DOM-driven browser interactions verified real HTTP/MySQL flows instead.
- API is running on its latest account-enabled build on port 3000. Two new
  synthetic customer accounts/bookings were created for browser verification.
  No real personal data, emails or payments; no commit/push/deployment performed.

- Date: 2026-10-24. Central sibling project at
  `E:\AI Projects\repositories\client-platform-api` using NestJS 11, TypeScript
  and mysql2 with separate `salon_eyelash_mansion` and `salon_ana_glow` schemas.
- Architecture documented before implementation in `docs/architecture.md`.
- Live local API: http://127.0.0.1:3000/api/v1. Eyelash Mansion preview:
  http://127.0.0.1:4321/. Ana Glow preview: http://127.0.0.1:4322/.
- Local owners: `owner@eyelash.example`, `owner@anaglow.example`. Passwords are
  only in ignored environment configuration, not in history or frontend files.
- Both Angular 21 websites use API-backed booking in development, with owner
  login and guarded booking management. Public pages stay public. Production
  preserves demo mode until a hosted API and same-origin proxy are configured.
- MySQL migrations and seed ran successfully without resetting existing schemas.
- Tests: 5 backend unit, 10 real-MySQL integration, 6 original frontend, 8 Ana
  Glow frontend tests pass; backend and both frontend builds pass.
- Browser: both guest bookings saved; owners see only their own appointments;
  original booking cancellation and logout verified, session restored on reload.
  Owner views have no desktop/mobile overflow and passed axe WCAG A/AA scans.
- Original browser test booking was cancelled; Ana Glow test booking remains
  confirmed. Both contain fictional test details only. Integration test schemas
  are disposable and cleaned automatically; actual tenant schemas are preserved.
- Remaining: no commits/push/deployment requested for this exchange. Review
  changes, create a backend repo if desired, and deploy a persistent HTTPS API
  with tenant-specific least-privilege DB credentials/TLS before production use.

## 2026-10-24 - Multi-tenant backend and two frontend integrations

**Request:** Central reusable Node/NestJS backend with per-client MySQL schemas,
environment credentials, secure user/owner authentication and authorization,
guest booking, protected owner booking management, migrations, tests, frontend
integration and onboarding documentation.

**Inspection/design:** Confirmed both client apps are Angular 21 standalone
apps with lazy routes and synchronous localStorage booking. MySQL80 service
is running on port 3306. Existing live static demos must not break. Chose
server-allowlisted schemas/origins, fixed per-tenant pools, opaque revocable
sessions, CSRF, role checks, MySQL rate limits and resource/date locking.

**Implemented:** Config validation, migration profiles, versioned schema
migrations, non-destructive demo seeds, operator owner provisioning, bcrypt-12
passwords with byte-limit validation, optional CUSTOMER registration, secure
tenant-specific cookies, origin/CSRF/role guards, no-store responses, safe
error responses/request IDs, public business/availability/booking endpoints,
transactional overlap prevention, idempotency, owner list/status endpoints,
TLS production checks and security-record cleanup command. API binds loopback
locally; production listener and proxy trust are explicit configuration.

**Frontend changes:** Added per-app backend config/development replacement and
proxy, HttpClient API service with in-memory session/CSRF state, owner guard,
login/dashboard pages, footer access link, server-authoritative services/slots,
asynchronous safe confirmation, request-error states, idempotent retry keys and
no silent fallback. Kept existing production demo booking to avoid breaking
Netlify sites before a backend is hosted. Fixed observed owner-page inherited
contrast/footer-link issues, and clarified footer notices for enabled API mode.

**Files:** Backend package/lock/config, ignored `.env`, safe `.env.example`,
tenant configs, `src/config.ts`, main/bootstrap/modules, auth/security/common,
database and booking modules, migration/seeds/CLI, three test files, architecture,
README and these agent/history files. Both frontends: angular.json, proxy,
API/config/guard tests, app config/spec/routes, salon data, booking TS/HTML,
owner pages, footer HTML and original header/footer CSS. Project histories and
READMEs updated; existing user history changes preserved.

**Commands:** npm install/ci-compatible lock, backend unit/build/integration,
db:migrate (including rerun), db:seed, owner:create for both tenants; Angular
test --watch=false and build for both apps; dev servers on ports 3000/4321/4322;
Playwright browser interactions and axe scans. No credential values logged.

**Validation and repairs:** Tenant config tests rejected arbitrary schemas,
duplicate routing, unsupported profiles, invalid origins/timezones. Fixed a
Luxon test-clock type-inference mismatch. Replaced tsx runtime with tsc/Node
because Nest requires emitted decorator metadata. All 5 unit and 10 MySQL
integration checks pass, including concurrent different-duration overlapping
services (one success, one conflict), idempotent retry, body tampering, role
injection, tenant-cookie swap, CSRF/multibyte tokens, expiry/inactivity/logout,
shared rate limits and malformed/oversized JSON (400/413). All frontend tests
and builds pass. Browser demonstrated two schemas' same-time bookings without
cross-client data; cancellation releases availability and logout returns 401.
Old image aspect-ratio dev warnings remain unrelated to this change.

**Operational limitations:** No email/SMS delivery, MFA, self-service password
recovery or email verification; operator manages recovery. One shared studio
resource initially, sample business schedules, no payment. Production requires
approved service data, retention policy, HTTPS API host/proxy, verified MySQL
TLS and per-tenant grants. Native PowerShell terminal intermittently prefixed
control characters or returned partial command output; checks were rerun with
explicit Node/npm paths and completed results captured.

## 2026-10-24 18:19 IST - Named customer accounts and private booking history

**Request:** Add Register from Sign In, require Name/Email/Password, allow
customers to sign in and book, and show their past/future appointments.

**Design/actions:** Inspected existing auth/booking/UI boundaries. Added
transactional named registration and safe profile names in sessions, using
additive migration 002 (`user_profiles`, `customer_appointments`). Added
CUSTOMER-only booking/history endpoints, session-bound ownership, CSRF/rates,
account-scoped idempotency and timezone-based paginated past/upcoming queries.
Preserved anonymous booking hashes and deliberately did not backfill guest
appointments using unverified emails. Existing owners remain functional.

**Frontend:** Shared role-aware Sign In, Register link/page with mandatory
fields and validation, success redirect, customer guard/My Bookings UI, periods/
paging/errors/logout/new-booking link, session-aware header and booking prefill.
Signed-in customer submissions use protected account endpoints; confirmations
link to My Bookings. Both websites retain their brand/tenant configuration.

**Files/commands:** Backend migrations/auth/context/security/booking/modules/
integration tests; both API clients/tests, customer guard, account pages/tests,
sign-in files, header files, routes and booking files; READMEs, architecture
and three histories. Ran backend build/unit/integration/db:migrate, complete
Angular tests/builds, restarted API, and exercised browser forms with synthetic
data. No credentials added to logs, frontend config or histories.

**Validation:** Backend 5 unit + 12 real-MySQL checks pass. Missing/blank name,
missing email/password, invalid email/weak password, role escalation, customer
CSRF, cross-account/tenant history, private idempotency and past/upcoming
membership verified. Original frontend 15 and Ana Glow 17 tests pass; all builds
pass. Live browser flows in both apps register/login/book/show only their own
booking; reload restores session. Customer views have no measured overflow and
axe A/AA reported no violations. Native actionability waits were blocked by the
hidden tab, so browser form submissions were DOM-driven, not pointer tests.
One patch batch was rejected without changes; corrected duplicate file entry.
Ana Glow's copied header signal required `links()`; fixed and reran tests.

**Open items:** No guest-booking claim/import until ownership can be verified.
Customer email verification/recovery/MFA/notifications and production hosting
remain outside this request. Existing demo-mode production protection remains.
Changes are local/uncommitted. API and both dev servers remain running.

## 2026-10-24 18:48 IST - Publish all three Git repositories

**Request:** Commit and push every repository; backend URL supplied by user.

**Inspection/actions:** Both frontend origins already configured correctly and
their local main branches matched GitHub before new commits. Initialized this
backend's Git metadata on main, configured the supplied origin, fetched and
inspected remote initialization `bd1a017` (one-line README only). Preserved it
through a normal unrelated-history merge while retaining the full setup guide.
Updated README and all required handoffs; staged all authorized project files.

**Safety:** Verified ignore rules exclude `.env`, node_modules, dist and
dist-test. Safe `.env.example` has no password values. Checked staged file
names, whitespace and secret patterns/long environment values without printing
credentials. No database data or local owner passwords are committed. No
force-push, unrelated file reversion or deployment activation performed.

**Validation/Git commands:** Run backend unit/integration/build and both Angular
test/build gates, git add --all, git diff --cached --check, staged secret/output
scan, commits, normal backend README-history merge, git push -u origin main,
git ls-remote comparison against rev-parse HEAD, and clean status checks across
all three repositories. Use git log for exact commit IDs (not self-referenced
inside a commit's own history file).

**Open items:** Production backend hosting, restricted grants/TLS, frontend
same-origin API proxies and explicit production API activation remain pending.
Pushing source to GitHub does not deploy the API. Local dev servers stay up.