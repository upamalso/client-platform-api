# Render Free Deployment

## Prepared Cloud State

- Aiven MySQL has separate `salon_eyelash_mansion` and `salon_ana_glow` schemas.
- Both versioned migrations and the fictional business/service seeds are applied.
- Each schema has a dedicated runtime MySQL user, limited to SELECT, INSERT,
  UPDATE and DELETE in that schema. Both users require SSL and cannot read the
  other tenant's tables. Neither has global data privileges or GRANT OPTION.
- Demo business owners are `owner@eyelash.example` and `owner@anaglow.example`.
- Generated runtime passwords are in ignored `.env.render`; owner login
  passwords are in ignored `.env.cloud-owners`. Do not upload owner passwords
  to Render and do not copy any secret values into chat or Git.
- `.env.aiven` contains the operator/admin configuration. It is for local
  provisioning only, NOT for the public service. Local `.env` is unchanged.

The production-mode API was tested locally against Aiven using restricted
credentials: readiness, owner login, Secure/HttpOnly host cookies, availability,
guest booking, owner listing/cancellation and logout passed for both tenants.
Only synthetic test bookings were created, then cancelled and deleted. This
does not mean Render or the Netlify production API proxies are deployed yet.

## 1. Publish Deployment Changes

Commit/push the prepared backend code/docs after explicit user approval. The
new `npm run start:prod` alias uses hosting-injected environment variables, and
MySQL TLS explicitly verifies both the certificate chain and hostname. Do not
publish any of the ignored operator/runtime/owner environment files.

## 2. Create a Free Render Web Service

Connect `upamalso/client-platform-api`, branch `main`, using Node runtime.

| Setting | Value |
| --- | --- |
| Instance | Free |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm run start:prod` |
| Health check path | `/api/v1/health` |
| Node version | 24 (set `NODE_VERSION=24`) |

The build needs development dependencies because TypeScript compiles the API.
Do not use `npm start`: it intentionally expects the local development `.env`.
Render supplies PORT; do not hardcode a port or select a paid instance.

## 3. Add Runtime Environment

Use Render's **Environment > Add from .env** to import the existing ignored
`.env.render` file directly. Its values include:

- NODE_ENV=production, API_HOST=0.0.0.0, verified MySQL TLS and pool limit 3.
- Provider host/port and the two separate runtime usernames/passwords.
- DB_USER/DB_PASSWORD use the first restricted runtime account, not avnadmin.
- TENANTS_FILE=/etc/secrets/tenants.render.json.
- DB_SSL_CA_FILE=/etc/secrets/aiven-ca.pem.
- TRUST_PROXY_HOPS=0 until the actual trusted proxy chain is established.

Do not import `.env.aiven`, `.env.cloud-owners` or local `.env`. Do not set
MIGRATION_DB_USER, MIGRATION_DB_PASSWORD or OWNER_PASSWORD in the public API;
the runtime does not need operator credentials or plaintext owner passwords.

## 4. Add Two Secret Files

Render's **Environment > Secret Files** makes each file available beneath
`/etc/secrets/` using its exact configured filename:

1. `aiven-ca.pem`: contents of the existing Aiven CA certificate in the sibling
   `certificate` directory. Use the certificate, not a private key or URI.
2. `tenants.render.json`: contents of this repository's prepared tenant file.
   It contains the exact Netlify origins and environment-variable names, not
   passwords. Its configured origins currently are:
   - https://eyelash-mansion-demo.netlify.app
   - https://ana-glow-beauty-studio.netlify.app

Ensure all environment variables and both secret files exist before expecting a
successful startup. If an initial deploy ran too early, redeploy after adding
the settings. Keep certificate verification enabled; never work around missing
CA files by turning TLS checks off.

## 5. Verify API Deployment

Open `https://<assigned-service>.onrender.com/api/v1/health` and expect
`{"status":"ok"}`. Keep the assigned URL so both frontend proxies can be
configured. Do not assume a successful build means database readiness passed.

Render Free sleeps after idle time and can take around a minute to wake. Open
the health URL before a scheduled client review. Free service limits are not
a production availability guarantee.

## 6. Activate the Two Websites Separately

After the public API is healthy, add a same-origin `/api/*` rewrite before each
Netlify SPA fallback and explicitly enable that app's production backend mode.
Use the real Render hostname, preserve the correct tenant slug and verify
Secure cookies through the proxy. No frontend receives database credentials.

Validate registration, sign-in, customer My Bookings, anonymous/signed-in
booking, owner management, logout and cross-tenant rejection on the actual
public URLs before sending links to clients. Do not enable production mode
before the backend/proxy is available. Do not change the sample business
contact details to real personal information without owner approval.

## Future Operations

Run future migrations with the ignored operator settings from a trusted local
environment, not using runtime accounts. Back up before changes; do not rerun
CREATE USER with new passwords or overwrite the existing generated owner files.
Keep the ignored credential files securely: they are the local record needed
to configure Render and access the newly created cloud demo owners. Owner
passwords should be changed before collecting real client data.