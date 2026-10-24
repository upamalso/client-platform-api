# Client Platform API History

Read before making changes; update after every user exchange. Never store
credentials, tokens or personal customer information here.

## Resume Here

- Cloud setup completed: 2026-10-24 20:49 IST. Rotated operator password was
  validated without displaying it. Both Aiven tenant schemas have migrations
  001/002 and 13 fictional services each. Created TLS-required, schema-specific
  DML runtime users (`cp_lashes_runtime`, `cp_glow_runtime`), with no global
  data/DDL/grant permissions; cross-schema SELECT was denied for each.
- Generated secrets are retained ONLY in ignored local `.env.render` (Render
  runtime import) and `.env.cloud-owners` (cloud demo owner login credentials).
  Existing `.env` was not changed. `.env.aiven` is the privileged local operator
  config and must NOT be uploaded to Render. Never echo any of these values.
- Cloud demo owners: owner@eyelash.example and owner@anaglow.example, with new
  generated passwords distinct from local development credentials. Do not
  overwrite their generated credential file or reset existing users silently.
- Production-mode API against Aiven passed readiness, owner login, Secure
  HttpOnly host-cookie flags, availability, guest booking, owner list, cancel,
  logout/revocation for BOTH tenants. Temporary synthetic bookings were removed;
  the temporary readiness server stopped. Existing local dev servers untouched.
- Render prep is ready: `docs/render-deployment.md`, `tenants.render.json`,
  `start:prod` alias, explicit TLS hostname verification. User confirmed Ana
  Glow origin https://ana-glow-beauty-studio.netlify.app and approved committing/
  pushing BACKEND preparation. Private env/owner files remain ignored. Backend
  deployment itself still requires the user's Render dashboard setup.
- Next: create Render FREE Node web service, import only `.env.render`, add CA
  and tenant JSON secret files using exact paths in the guide. After public
  health succeeds, obtain its assigned URL and activate both Netlify API proxies
  and production frontend mode. Do not activate frontends before API readiness.

- 2026-10-24 20:22 IST: User reports rotating the previously exposed Aiven
  password; do NOT retry the old value. Created ignored/untracked `.env.aiven`
  with known cloud host/port/admin username/CA and absolute tenant config path,
  DB_PASSWORD intentionally blank. User will enter it directly in the local
  file and confirm ready. Never read its filled contents into tool output/chat.
- This file is strictly a trusted local CLI operator configuration: TLS on,
  NODE_ENV=development to allow the existing controlled demo seed command,
  API_HOST loopback. Do NOT deploy it or use admin credentials for the public
  runtime. Render requires separate production origins/tenant credentials/TLS.
  No cloud writes or retries were performed; await user readiness, then provision
  schemas/migrations/restricted users/demo owners and validate before deploying.

- Successful cloud probe: 2026-10-24 20:16 IST. User supplied
  `E:\AI Projects\repositories\certificate\ca.pem`; certificate is a currently
  valid CA. mysql2 connection authenticated with CA verification AND hostname
  verification enabled. Read-only SELECT 1/defaultdb/version and TLS status
  passed: MySQL 8.4.11, TLS_AES_256_GCM_SHA384. Prior self-signed trust blocker
  resolved. No expected tenant schemas found; setup still required before API
  readiness. No changes to hosted schemas/data/users or local app environment.
- Temporary ignored probe credentials deleted and verified never tracked.
  Do not put the supplied URI/password in Git/history. Previously disclosed
  admin password remains valid and should be rotated before deployment.
  Next: cloud schema/migration/restricted-user setup and Render Free using this
  CA as a secret file, then frontend same-origin proxy activation. Not deployed.

- Hosted MySQL update: 2026-10-24 20:07 IST. User provisioned Aiven MySQL and
  requested a connection check. TCP endpoint reachable, but strict certificate-
  verified TLS failed: HANDSHAKE_SSL_ERROR / SELF_SIGNED_CERTIFICATE_CHAIN.
  Do NOT report database login or tenant schema readiness as verified yet.
  Need the Aiven CA certificate from the user (local path is sufficient).
- A database password was disclosed in conversation; advised rotation. Values
  deliberately omitted from history and tracked source. Temporary ignored
  diagnostic environment file was removed and confirmed never tracked; local
  development environment unchanged. No SQL mutation/migration performed.
- Backend should go on Render Free with `node dist/main.js`, production env,
  0.0.0.0 binding and CA certificate secret file, not local `.env` npm start.
  First provision the two tenant schemas and restricted runtime users/migrations,
  then validate live API and activate Netlify proxies. No deployment created.

- Hosting research: 2026-10-24 19:32 IST. Recommend Render Free for this API,
  Aiven Free MySQL with two separate tenant schemas, existing Netlify frontends.
  User has not created/selected services; no deployment performed. Render has
  idle cold starts; Aiven free services may be powered off when inactive.
- Deployment preparation will need a cloud start command (`node dist/main.js`,
  not the local `.env`-requiring npm start), API_HOST=0.0.0.0, host-injected
  port/secrets, verified MySQL TLS CA, exact website origins, actual restricted
  DB users/grants, migrations and approved demo seeds/owner setup. Netlify API
  rewrites/production activation wait until live health/auth/booking validation.

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

## 2026-10-24 19:32 IST - Free hosting recommendation (not deployed)

**Request:** Host the API/MySQL free for shareable end-to-end login/booking demos.

**Research:** Official Render free documentation confirms Node web hosting,
15-minute idle sleep, roughly minute cold starts, 750 shared monthly instance
hours, ephemeral local disk, external-traffic limits, no free shell/one-off
jobs. Aiven MySQL Free lists 1 GB disk, 1 GB RAM, max 76 connections, no card
requirement or fixed expiry, backups, but inactive-service shutdown/no SLA.
Aiven's database guide explicitly supports additional databases for isolation;
one service is not limited to one tenant schema. Actual user/grant availability
must be checked during provisioning, without weakening runtime tenant isolation.

**Recommendation:** Netlify + Render Free + Aiven Free MySQL for demos. Railway
has a $1 monthly free allowance and $5 trial credit, not a reliable free always-
on API+MySQL budget. Koyeb's free web instance is a possible alternative but
requires card verification, defaults to a paid plan during signup per its FAQ,
and sleeps after an hour; not the default strict-free recommendation.

**Implementation considerations:** Existing config requires production HTTPS
origins, tenant-specific credential env names, non-root runtime users and TLS.
Pool size 5 per tenant fits documented free connection limits. Local scripts
require `.env` but cloud must use injected env/start commands; free Render has
no shell so initial cloud migrations/provisioning must run from a trusted local
operator environment or another deliberate deployment step. Demo seeding is
currently disabled in NODE_ENV=production; initialize cloud sample data through
controlled operator setup, never by disabling runtime security. Preserve the
same-origin proxy cookie design. Cloud credentials belong in provider secret
settings or ignored local operator files, never chat/GitHub/frontend bundles.

**Sources:** https://render.com/docs/free,
https://aiven.io/docs/products/mysql/concepts/mysql-free-tier,
https://aiven.io/docs/products/mysql/howto/create-database,
https://aiven.io/docs/platform/concepts/service-pricing,
https://docs.railway.com/reference/pricing/plans,
https://www.koyeb.com/docs/reference/instances,
https://www.koyeb.com/docs/faqs/pricing.

**Actions/files/validation:** Reviewed config/pool/migration/CLI/scripts and
updated all three project histories only. No application code, environment
credentials, accounts or deployed resources changed; no build/test rerun needed.
No new commit or push. Next step is user provider/account selection, then a
small verified deployment-preparation change and guided provisioning.

## 2026-10-24 20:07 IST - Aiven connectivity probe and Render next steps

**Request:** Check the newly hosted MySQL endpoint and explain backend hosting.

**Safety/actions:** User provided a password; warned to rotate it, never record
it here. Confirmed the temporary `.env.*` diagnostic file is ignored and absent
before creating it. Used supplied values for read-only TCP/mysql2 checks with
rejectUnauthorized=true, no credentials printed by the command. Deleted the
file immediately after diagnosis; verified removal and no tracked entry.
Did not replace the existing local development `.env` or application config.

**Validation:** TCP connection succeeded. Verified MySQL handshake failed with
HANDSHAKE_SSL_ERROR; sanitized follow-up classified the reason as
SELF_SIGNED_CERTIFICATE_CHAIN. No authenticated query was executed successfully,
so credentials, default database contents, tenant schemas and grants remain
unverified. No rejectUnauthorized=false workaround used. Need trusted Aiven
CA certificate before secure retry. Cloud read-only test changed no schemas,
tables or appointments.

**Hosting recommendation:** Render Free Node web service linked to this GitHub
repo/main, build `npm ci --include=dev && npm run build`, start
`node dist/main.js`, health `/api/v1/health`. Render secrets must supply
NODE_ENV=production, API_HOST=0.0.0.0, DB_TLS=true, provider DB settings,
tenant-specific credentials and exact allowed origins. Configure CA as a
Render secret file and point DB_SSL_CA_FILE to `/etc/secrets/<filename>`.
The provider's starter `defaultdb` does not replace the planned per-client
schemas; migrations/users/sample data setup is still pending. Production
startup validates those schemas/migrations, so a service cannot be called ready
before they are configured. No deployment blueprint/app edits made yet.

**Sources:** https://render.com/docs/configure-environment-variables and
https://aiven.io/docs/products/mysql/howto/connect-from-cli. User should download
the service CA certificate and provide its local path, not another password in
chat. Re-enter rotated credentials only in provider secret settings or an ignored
operator environment. No commit/push/deployment; histories updated only.

## 2026-10-24 20:16 IST - Successful CA-verified Aiven MySQL connectivity

**Request:** User supplied the local certificate directory to finish the
previous hosted connection check.

**Actions:** Located its CA file, parsed with Node X509Certificate and checked
CA status/current validity. Used the existing supplied connection details in a
temporary Git-ignored environment solely for a read-only test. mysql2 SSL used
the explicit CA, rejectUnauthorized=true and verifyIdentity=true; no TLS bypass.

**Verified results:** Authenticated to defaultdb, SELECT 1 returned success,
server version 8.4.11, encrypted session using TLS_AES_256_GCM_SHA384. Queried
information_schema for only `salon_eyelash_mansion` and `salon_ana_glow`; neither
is present. Existing hosted service still needs tenant schemas/migrations and
restricted runtime users before production API startup can pass readiness.

**Safety/cleanup:** Removed temporary credentials immediately after the check;
asserted the file is absent and no tracked Git entry exists. No secrets printed
by the command or recorded here. Local development `.env` unchanged. No SQL
writes, migrations or data import; three histories only updated. Disclosed
password should be rotated before any public deployment.

**Next:** Provision cloud schemas/users with controlled operator settings and
configure Render Free with a cloud start command, proper TLS CA secret path and
tenant-specific environment. Frontend production API activation waits for live
health/login/booking checks. No code edits, test/build runs, commits, pushes or
Render deployment performed during this probe.

## 2026-10-24 20:22 IST - Local operator template for rotated credentials

**Request:** User reports password rotated and asks what to do next.

**Actions:** Inspected current CLI/migration/scripts/production tenant template
and security architecture. Confirmed `.env.aiven` was absent and ignored, then
created it with known nonsecret Aiven connection metadata, TLS enabled, public
CA file path, tenant config path and a blank DB_PASSWORD. No credentials copied
from the previous conversation; existing `.env` unchanged. User must type the
new password directly in this ignored local file, not chat or an ask tool.

**Verification:** Node parseEnv checks confirm blank password, operator-only
development/loopback configuration, TLS=true, valid CA and tenant file paths;
Git confirms excluded and untracked. No connection attempted with a blank or
old password. File will be used only by trusted CLI provisioning, never the
public API. Production remains strict and must use restricted runtime users.

**Next:** Once the user confirms local input is ready, run controlled schema
and migration setup, verify operator privileges for scoped runtime users,
prepare approved demo data/owners, and generate a safe Render deployment plan.
Do not echo the file or secret values, and do not upload this development/admin
operator configuration to Render. Three histories updated; no app-code changes,
tests/builds, commits/pushes or deployment. Database not modified this exchange.

## 2026-10-24 20:49 IST - Initialize Aiven and prepare Render publication

**Request:** User confirmed the ignored operator configuration is ready. Prior
agreed scope: initialize schemas/migrations, scoped users and demo owners, then
prepare Render deployment. User later provided the actual Ana Glow public URL
and explicitly approved committing/pushing backend preparation.

**Verification/setup:** Parsed edited operator env privately; authenticated
with CA/hostname verification. Read permission capabilities and confirmed both
schemas initially absent. Ran existing migration/seed CLI against Aiven only.
Both schema versions applied; only existing fictional menu/business data seeded.
No local DB settings or original local database data changed.

**Runtime identities:** Generated cryptographic passwords into ignored files
before CREATE USER. Created cp_lashes_runtime / cp_glow_runtime with REQUIRE SSL,
granted only SELECT/INSERT/UPDATE/DELETE on their exact schema, without GRANT
OPTION. Checked actual grants and verified cross-schema access fails. Created
two cloud demo OWNER users with bcrypt hashes. Existing owner/user credentials
were checked, never silently reset. Credential files are durable local records
for Render/owner login; do not delete or regenerate without a planned rotation.

**Repair:** The first strict grant check rejected Aiven's SHOW GRANTS schema
format because it used double quotes rather than backticks. Inspected only
privilege/target metadata, normalized the quote format, resumed idempotently
using the original generated secrets and verified both runtime users. No
fallback to admin access or relaxed grant checks.

**Application/deploy prep:** Added explicit mysql2 TLS hostname verification to
runtime/migration connections and a cloud-safe `npm run start:prod`. Added
exact-origin tenants.render.json (Eyelash Mansion existing Netlify URL and
user-confirmed Ana Glow URL), deployment guide and README link. Runtime import
references CA and tenant files under /etc/secrets. Public files scanned for
generated secret values; none found. No frontend API activation yet.

**Validation:** Backend production build and 5 unit / 12 real-MySQL integration
checks pass. In addition, a temporary production-mode Nest server used only
the new Aiven scoped credentials and verified both tenants' full owner/guest
booking flows with Secure HttpOnly __Host cookies and CSRF. Confirmed logout
invalidates sessions. Only synthetic test bookings were cancelled/deleted by
their exact generated IDs. Cloud sample business/services and owners remain.
Generated secret/operator files are ignored/untracked and never printed.

**Git/status:** User approved backend-only publication. Stage only the safe
README, history, package/start script, TLS connection code, tenant JSON and
deployment guide; secret files must remain excluded. Push main normally and
verify remote/local HEAD equality. Frontend history handoffs remain local.
Render signup/deploy and Netlify activation are not completed by this commit.