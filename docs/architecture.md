# Central Client Platform API

## Scope and inspected applications

Both `beauty-salon-web` (Eyelash Mansion) and `ana-glow-beauty-studio` use
Angular 21 standalone components, reactive booking forms, and localStorage-only
demo appointments. Their service IDs, prices and durations differ. Both retain
their public pages and independent design. No existing databases are replaced.

## Tenant boundary

MySQL databases and schemas are equivalent. Each tenant gets its own database,
versioned migrations, users, sessions, services, booking locks and appointments.
An operator-controlled configuration maps a public tenant slug to a validated
database name, permitted web origins, business timezone and migration profile.
Requests cannot supply a database name, credentials or migration profile.

`X-Tenant-ID` is a routing hint, not authorization. The server resolves it through
the allowlist, checks the request Origin against that tenant, and looks up the
session in that tenant's database. Owner routes additionally check the current
database user's active status and OWNER role. A tenant A session does not grant
access to tenant B, even if headers or appointment IDs are changed.

Pools select a fixed database; no request-dependent `USE` statements or shared
mutable current-tenant singleton. Production should use one least-privilege
MySQL user per database, with separate migration credentials. Local development
uses the supplied MySQL account through ignored environment files only.

## Authentication and authorization

Guest booking requires no account. Optional customer registration creates only
CUSTOMER users; OWNER accounts are provisioned by an operator CLI, never by a
public role field. Passwords use bcrypt with cost 12, minimum 12 characters and
an explicit 72-byte limit. Generic login errors prevent account enumeration.

Sessions are cryptographically random opaque tokens; only SHA-256 digests are
stored in MySQL. Tenant-specific cookies are HttpOnly, SameSite=Lax and Secure
in production, with fixed expiry. Production uses a same-origin `/api` reverse
proxy per website, avoiding third-party cookie dependence. Login rotates the
cookie; logout revokes the session. Expiry and user role/status are checked on
every protected request. No auth tokens are stored in browser localStorage.

Authenticated writes require a session-bound CSRF token and an allowed Origin.
Browser responses never contain hashes, session tokens, SQL errors or database
credentials. Credentials, tokens and booking contact information are not logged.

## Booking consistency

Availability is computed on the server using the tenant's timezone, opening
hours, service duration and existing bookings. One shared studio resource is
seeded initially; the schema supports additional resources later. Time slots
are generated on a 30-minute grid. Past dates, closed days, unknown services,
overruns and overlapping appointments are rejected server-side.

A booking transaction locks a `(resource, business date)` row before checking
overlaps and inserting. This protects different services and durations, not just
identical start times, across multiple API instances. A unique idempotency key
and normalized request digest make retries safe; reuse with a different payload
returns 409. Public responses expose only the new booking's confirmation;
there is no public appointment list or lookup by predictable booking reference.

Owners can list/filter their bookings and cancel or complete confirmed bookings.
Terminal states cannot be arbitrarily reopened. Rates are enforced in MySQL per
tenant, client IP and endpoint so multiple API instances share limits. Proxy
trust is off by default and must be configured for the actual deployment.

## API contract (`/api/v1`)

All tenant routes require `X-Tenant-ID`; browser origins must be configured.

| Method | Path | Access | Result |
| --- | --- | --- | --- |
| GET | `/health` | Public | Readiness without credentials |
| GET | `/public/business` | Public | Safe business info, service menu, timezone |
| GET | `/public/availability?serviceId=...&date=YYYY-MM-DD` | Public | Available local times |
| POST | `/public/appointments` | Guest | Confirmation; requires UUID Idempotency-Key |
| POST | `/auth/register` | Public | CUSTOMER account, no owner role selection |
| POST | `/auth/login` | Public | Session cookie and safe user/CSRF response |
| GET | `/auth/me` | Session | Current safe user/CSRF response |
| POST | `/auth/logout` | Session + CSRF | Revokes cookie/session |
| GET | `/owner/appointments?date=...&status=...` | OWNER | Tenant-only booking list |
| PATCH | `/owner/appointments/:id/status` | OWNER + CSRF | Cancel or complete booking |

Booking input: serviceId, date, time, firstName, lastName, email, phone,
newClient, notes. Prices, resource, duration, role, status and tenant/schema
are never accepted from a booking payload. DTOs reject extra fields.

## Frontend integration and deployment

Each Angular application has its own public tenant configuration, API service,
owner login and guarded booking-management route. Guest pages stay public.
Local `ng serve` proxies `/api` to NestJS. Development enables server booking;
production retains the existing demo until a hosted API/proxy is configured.
An unavailable enabled API displays an error, never a fake successful booking
or a silent localStorage fallback. Existing local demo bookings are not imported.

The owner guard is usability only; backend guards are authoritative. Owner data
is fetched with credentials, held in memory and cleared on logout/session expiry.

## Verification gates

1. Validate configuration, tenant allowlist and live MySQL connection.
2. Run migrations and seed separate schemas without destructive resets.
3. Test auth, CSRF, roles, origin/header tampering and tenant isolation.
4. Test guest booking, validation, idempotent retries and concurrent overlaps.
5. Build/test each frontend, then exercise guest booking and owner management
   across both tenants in a browser and against real MySQL.

Production additionally requires HTTPS, restricted DB grants, secret management,
backups, retention policy, monitoring, real business-approved schedules/services,
and an actual backend host. Sending email/SMS is not simulated: API confirmation
is immediate, but notification delivery requires a separately configured provider.

## Customer Accounts Extension (2026-10-24)

Registration now requires name, email and password. Migration
`002-customer-accounts` adds `user_profiles` and `customer_appointments` through
rerunnable CREATE statements, without altering or resetting existing users or
bookings. User/profile registration is transactional. Existing owner accounts
continue working and may have an empty profile name until separately configured.

Both websites use shared Sign In plus `/register` and guarded `/account/bookings`.
Owners retain their existing management route; customers can sign in, book, and
view only their own upcoming/past appointments. API sessions expose safe profile
name/email/role data; session tokens remain HttpOnly and hashed in MySQL.

`POST /customer/appointments` requires CUSTOMER role, valid session/Origin/CSRF,
and idempotency. Booking ownership comes only from session user ID, never an
email or submitted customer ID. Account link insertion is in the same booking
transaction. Requests are deduplicated within their account identity. Public
guest booking remains unchanged and does not auto-link to an account.

`GET /customer/appointments?period=upcoming|past&page=1&limit=10` joins only
account-linked bookings for the authenticated user within their tenant schema.
Period boundaries use the business timezone and appointment end minute; paging,
filtering and ownership checks all happen on the server. No public lookup or
automatic email-based claiming of earlier guest appointments is introduced.