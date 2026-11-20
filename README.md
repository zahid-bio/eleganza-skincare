# Eleganza Skincare

Eleganza is an editorial storefront and staff workspace for the four-product skincare and complexion collection. The application is configured for staging, with local simulated checkout and optional Stripe sandbox checkout.

## Run the preview

Use Node.js 24 and pnpm 11 from this project directory.

```sh
pnpm install --frozen-lockfile
pnpm dev --hostname 127.0.0.1 --port 3218
```

Open [the storefront](http://127.0.0.1:3218/) or [staff access](http://127.0.0.1:3218/admin). A fresh checkout creates a persistent embedded PostgreSQL database under `.data/`. Set `DATABASE_URL` to use a separate PostgreSQL database and use only synthetic data in staging. The initial SQL schema and launch seed are applied at first connection. Leave the preview bound to loopback for local use.

For staff access, configure `PREVIEW_SESSION_SECRET` and one or more role-specific keys in `.env.local` using the names in `.env.example`. Use distinct random values, for example output from `openssl rand -hex 32`. Enter the relevant key at `/admin`. Roles are enforced in the server-rendered workspace and each mutation. Rotating a role key invalidates its local preview sessions.

| Role | Workspace access |
| --- | --- |
| Owner | All preview modules and audit log |
| Catalog | Product details, price, stock, publishing, search metadata and page content |
| Operations | Test orders, shipments, carrier links and delivery status |
| Support | Support cases and resolution |
| Analyst | Aggregate test order and inventory metrics |

The optional Google IAP path verifies the signed assertion and maps staff subjects to roles. Configure `IAP_AUDIENCE` and `IAP_STAFF_JSON` only after the business has an IAP-protected staging route, an approved staff directory, and MFA enforced there. Local keys are disabled when IAP is configured.

## Checkout and data

The bag is saved in the browser. The checkout service calculates prices from PostgreSQL and atomically reserves available preview stock. Repeating a checkout request returns the same order. Lookup requires the order number and checkout email.

The default checkout records a simulated order. To exercise Stripe's hosted sandbox form, provide both `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_WEBHOOK_SECRET`, set `APP_ORIGIN` to the browser-visible origin, and forward `checkout.session.completed` and `checkout.session.expired` to `/api/webhooks/stripe`. Confirm card results with Stripe's test values. Provider events are signature-checked on receipt, deduplicated and reconciled to the reserved order. Expiration releases stock. A Stripe availability failure before a session is recorded requires retrying the same checkout; reconcile unresolved reservations before any live implementation.

Test signup and support submissions are stored locally. Staff can see them in Email list and Support. This preview uses a single item per product because approved sizes and shades are pending.

## Verification and hosting

```sh
pnpm check
pnpm test
pnpm build
```

The Dockerfile packages the standalone Next.js build for container staging. Provide a staging database, the browser-visible HTTPS origin in `APP_ORIGIN`, and settings through deployment secrets if running outside a single local process. The preview blocks indexing. Its metadata, canonical URLs and sitemap support inspection of the planned public structure.

Launch requires genuine product photography, finished labels and formulas, signed-off shades and sizes, business and policy content, production accounts, payment and tax configuration, confirmed shipping and returns, customer authentication, and connected transactional email. The preview has no live deployment. Promotions, refunds, per-variant inventory, retention workflows, full staff administration, analytics integrations, and production monitoring/backup/rollback verification remain outside the implemented staging features.

See [the design and image decisions](DESIGN.md).
