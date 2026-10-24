# Client Platform API

Source repository: [upamalso/client-platform-api](https://github.com/upamalso/client-platform-api).

One NestJS 11 / TypeScript backend for multiple independent client websites,
using MySQL 8 with one isolated database/schema per tenant. Initial clients:
Eyelash Mansion and Ana Glow Beauty Studio. No frontend credentials or separate
per-client API deployments are required.

Read [architecture](docs/architecture.md) for the tenant boundary, API contracts,
session flow, booking transaction and decisions made before implementation.

## Local setup

Requirements: Node.js 22.12+ (tested with 24), npm, and running MySQL 8.

```powershell
npm.cmd ci
Copy-Item .env.example .env
```

The local ignored `.env` is already configured on this machine. For a new setup,
edit it directly with the supplied MySQL connection details; never commit it.
Set a strong `OWNER_PASSWORD` in that ignored file before provisioning owners.
The example intentionally contains no password. Do not copy credentials into
Angular configuration, history files, screenshots or URLs.

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run owner:create -- --tenant eyelash-mansion --email owner@eyelash.example
npm.cmd run owner:create -- --tenant ana-glow --email owner@anaglow.example
npm.cmd start
```

Owner creation inserts a new owner; it deliberately fails rather than replacing
an existing account. The two development owners above have already been created
on this machine, with their password in the ignored `OWNER_PASSWORD` setting.
Rotate development credentials before any production use. Demo seeds do not
overwrite existing business information or services and are disabled in production.

API health: http://127.0.0.1:3000/api/v1/health

Start each frontend from its own folder:

```powershell
npm.cmd start -- --host 127.0.0.1 --port 4321
```

Use port 4321 for Eyelash Mansion and 4322 for Ana Glow. Angular development
configuration enables the API and proxies `/api` to port 3000. Existing port
4200 was left untouched. Shared Sign In is `/owner/login`, registration is
`/register`, customer history is `/account/bookings`, and owner management is
`/owner/bookings`. Public routes and guest booking still require no login.

## Environment settings

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` or `production`; production enforces HTTPS origins, DB TLS and tenant credentials |
| `PORT`, `API_HOST` | API listener, defaults to 3000 / loopback; set `0.0.0.0` only behind the intended production proxy |
| `DB_HOST`, `DB_PORT` | MySQL host and port |
| `DB_USER`, `DB_PASSWORD` | Local development DB account; never sent to a browser |
| `DB_TLS`, `DB_SSL_CA_FILE` | Verified MySQL TLS; optional custom CA file; mandatory TLS in production |
| `DB_POOL_SIZE` | Per-tenant pool limit, default 5, maximum 20 |
| `TENANTS_FILE` | Operator-controlled tenant configuration file |
| `SESSION_HOURS` | Fixed session expiry, 1-24 hours, default 8 |
| `TRUST_PROXY_HOPS` | Default 0; set only for the exact trusted deployment proxy chain |
| `MIGRATION_DB_USER`, `MIGRATION_DB_PASSWORD` | Elevated migration account, separate from runtime tenant accounts |
| `OWNER_PASSWORD` | Operator-provided initial owner password, not a source-code default |

Tenant entries specify `userEnv` and `passwordEnv` names for their individual
runtime credentials. Production rejects root runtime users, missing credential
settings, non-HTTPS configured origins, and database connections without TLS.
See `tenants.production.example.json`; replace example domains and configure the
referenced environment variables using the host's secret manager.

## Database structure

| Table | Purpose |
| --- | --- |
| `schema_migrations` | Independently applied versions per tenant |
| `business` | Public business information and local opening schedule |
| `resources` | Bookable resources; one shared studio resource initially |
| `services` | Active menu, duration, authoritative price and resource |
| `users` | OWNER/CUSTOMER role, password hash and active flag |
| `user_profiles` | Required name for newly registered customers, linked to users |
| `sessions` | Hashed opaque token, CSRF token and expiry |
| `appointments` | Guest contact details, service/price snapshots, status and idempotency digest |
| `customer_appointments` | Account-to-booking links using authenticated customer IDs |
| `booking_locks` | Transactional resource/date locks preventing all duration overlaps |
| `rate_limits` | Cross-instance hashed-IP counters |

Local schemas: `salon_eyelash_mansion`, `salon_ana_glow`. No existing schemas
are dropped or reset. Integration tests create uniquely named `salon_test_*`
schemas after checking they do not exist, then delete only the schemas they
created. Test execution requires CREATE/DROP DATABASE privileges locally.

Migrations use an advisory lock and a version table. MySQL DDL auto-commits;
statements must be safely rerunnable after interruption. Existing migration
versions are immutable. Add new forward migrations, back up first, and validate
them on a copy of production data before release.

## API and authentication

Base path: `/api/v1`. All routes except health require `X-Tenant-ID` with a
registered slug. Browser Origin must belong to that tenant. All write requests
also require an allowed Origin; command-line clients must provide it explicitly.

| Method | Endpoint | Access |
| --- | --- | --- |
| GET | `/health` | Public readiness |
| GET | `/public/business` | Public business/menu |
| GET | `/public/availability?serviceId=classic-full&date=YYYY-MM-DD` | Public slots |
| POST | `/public/appointments` | Public booking, UUID-v4 `Idempotency-Key` |
| POST | `/auth/register` | Optional CUSTOMER registration |
| POST | `/auth/login` | Cookie session |
| GET | `/auth/me` | Current session and CSRF token |
| POST | `/auth/logout` | Session + CSRF |
| GET | `/owner/appointments?date=...&status=...&page=1&limit=25` | OWNER |
| PATCH | `/owner/appointments/:id/status` | OWNER + CSRF |
| GET | `/customer/appointments?period=upcoming&page=1&limit=10` | CUSTOMER; only their linked bookings |
| POST | `/customer/appointments` | CUSTOMER + CSRF + UUID-v4 Idempotency-Key |

Guest booking JSON:

```json
{
  "serviceId": "classic-full",
  "date": "2026-11-10",
  "time": "09:30",
  "firstName": "Sample",
  "lastName": "Guest",
  "email": "guest@example.com",
  "phone": "02079460000",
  "newClient": true,
  "notes": ""
}
```

Use a future open date within 90 days, not necessarily the example date. Times
are local to the tenant's configured timezone; server availability uses Luxon
and includes DST. Slots use a 30-minute grid with at least 30 minutes' lead time.
The server—not the form—chooses resource, price, duration and initial status.
Reusing an idempotency key with identical normalized input returns the original
confirmation; changing the input returns 409. Overlapping bookings also return
409. There is no public list or reference lookup exposing customer details.

Login input is `{ "email": "...", "password": "..." }`. Registration requires
`{ "name": "...", "email": "...", "password": "..." }`; names are trimmed and
must be 2-120 characters. Only the CLI creates OWNER users. Customer accounts
cannot access owner APIs; guest booking does not require an account.

Both websites link Sign In to Register. Successful registration returns to
Sign In with a success message. Login routes owners to management and customers
to My Bookings. Header navigation changes to the authenticated role's booking
page and restores the session after a reload. Booking prefills customer name
and email, while leaving phone and any missing booking details editable.

Signed-in customers use `/customer/appointments` with the same booking body as
guests. The server obtains ownership exclusively from the tenant-bound session;
no customer ID is accepted in the payload. The booking and account link commit
in one transaction. Idempotency includes customer identity, preventing another
account from replaying a saved request. Existing anonymous request hashes remain
compatible. Guest requests still use `/public/appointments` and remain unlinked.

My Bookings has Upcoming/Past views, paging, timezone, date/time, service, price,
status and reference. Past means the appointment has ended in the studio's local
timezone; ongoing appointments remain Upcoming until their end. History includes
all statuses. Customers cannot see other accounts or tenants. Prior anonymous
bookings are deliberately NOT claimed by matching an unverified email address.
An eventual guest-booking claim workflow will need verified ownership.

Login sets a tenant-specific HttpOnly cookie and returns safe `user`, `tenantId`
and `csrfToken`. Send cookies with requests and `X-CSRF-Token` for authenticated
writes. Store session/CSRF state in memory, not localStorage. Logout deletes the
database session and clears the cookie. Disabling a user or expiring a session
immediately denies subsequent protected requests. Registration/login cannot
select a schema or role. Login errors are generic; passwords use bcrypt cost 12,
minimum 12 characters, maximum 72 UTF-8 bytes to prevent silent truncation.

Owner status JSON: `{ "status": "cancelled" }` or `{ "status": "completed" }`.
Only confirmed bookings transition; cancellation releases availability, while
completed bookings continue occupying their historical slot. Rescheduling is
currently cancellation plus a new booking, not an unimplemented edit operation.
Owner list is paginated and filtered in the tenant schema, never in the browser.

Errors use `statusCode`, safe `message`, and a server-generated `requestId`.
SQL details and credentials are not returned. Responses use `Cache-Control:
no-store`; logs do not include passwords, cookies or guest contact data.

## Rate limits and maintenance

Tenant/IP limits: 300 requests/minute overall, 10 logins/15 minutes,
5 registrations/hour and 10 booking submissions/hour. Counters live in MySQL so
multiple API instances enforce the same limits. Do not enable proxy trust for
an untrusted or directly exposed forwarded-header chain.

Schedule this operator command daily:

```powershell
npm.cmd run db:maintenance
```

It deletes expired sessions and rate-limit rows older than a day, not bookings.
Define a business-approved booking retention/deletion process before collecting
real data. The demo has no email verification, self-service password recovery,
MFA or email/SMS delivery. Account recovery is operator-managed; these are
explicit follow-up capabilities rather than simulated security/notifications.

## Onboarding a client

1. Add a unique slug, unique `salon_...` database, approved name/timezone,
   migration profile and exact origins to the server-controlled tenant file.
2. Create a database-specific runtime user. Grant only SELECT/INSERT/UPDATE/DELETE
   on that tenant database, never global privileges. Configure separate secret
   environment variables and reference their names via `userEnv`/`passwordEnv`.
3. Run migrations with the elevated migration credentials. Populate approved
   business JSON, resources and service rows using parameterized administrative
   tooling; demo seeds are only for the initial two local clients.
4. Set `OWNER_PASSWORD` securely and run `owner:create` for the new tenant/email.
5. Configure that website's API client with its public tenant slug and API path,
   never its DB/schema name or credentials. Its framework need not be Angular;
   any HTTP client can use the same contracts.
6. Test guest booking, owner auth and cross-tenant denials before enabling it.

For schema extensions, register a new profile in
`src/database/migrations.ts`, reusing base migrations and adding versioned
tenant-specific changes. Configuration accepts only registered profiles, never
arbitrary paths. If a client's domain semantics diverge, add its domain module
and profile-aware repository inside this same backend rather than forking APIs.

## Production frontend activation

The Aiven tenant schemas, restricted runtime users and demo owners have now
been provisioned and checked using a production-mode API. Follow
[the prepared Render deployment guide](docs/render-deployment.md) to deploy
with the ignored runtime environment file and the CA/tenant secret files.
This local preparation does not mean Render or the frontend proxies are live.

Production Angular configuration intentionally keeps `enabled: false` until a
real API host is available, preserving existing Netlify demos. Development
configuration enables the integration. This is an explicit demo mode, not a
fallback when an enabled API fails: enabled failures show an error and never
pretend a local booking succeeded.

Use HTTPS and a same-origin reverse proxy per website to `/api`. For Netlify,
place an external rewrite BEFORE the existing SPA fallback, substituting the
real deployed API hostname:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://api.example.com/api/:splat"
  status = 200
  force = true
```

Set that website's production `backend.config.ts` to `enabled: true`, keep its
correct slug, deploy, and verify credentials/cookies through the proxy. Configure
the API's tenant origins with that exact website origin. Do not put DB passwords
or owner passwords in either public frontend configuration file. Production
cookie names use `__Host-`, Secure, HttpOnly and SameSite=Lax; no Domain attribute.

Host NestJS as a persistent Node service/container with MySQL network access.
It is not deployed as part of the static Angular Netlify build. Add TLS,
restricted runtime users, backups, process supervision, health monitoring,
approved privacy/retention policies and real business schedules before launch.
Source code is versioned on GitHub. The NestJS service still needs separate
hosting; pushing this repository does not deploy a backend. Frontend production
API mode remains disabled until the HTTPS API and proxy are configured.

## Verification

```powershell
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
```

Backend: 5 unit tests and 12 real-MySQL integration checks pass. Integration
includes concurrency, retries, validation, schema/role/session isolation,
CSRF, parser errors, inactivity, expiry, logout and shared rate limiting.
Customer tests also cover mandatory registration fields, profile names, account
booking ownership, customer/owner roles, past/upcoming history and cross-account
idempotency denial. Frontend suites: Eyelash Mansion 20 tests; Ana Glow 22 tests; both production
builds pass. Browser guest bookings, owner isolation, cancel, reload and logout
were exercised through the real proxy/API/MySQL path. Desktop/mobile owner views
were inspected and axe WCAG A/AA scans passed after focused accessibility fixes.
Customer registration, sign-in, booking and history were also exercised in both
running websites with synthetic data. Hidden-tab pointer checks were blocked;
DOM-driven browser interactions verified the real proxy/API/MySQL path instead.