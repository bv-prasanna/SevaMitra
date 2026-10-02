# SevaMitra Backend

A NestJS/Prisma/PostgreSQL backend for SevaMitra, a hyperlocal services
marketplace connecting customers with individual providers and provider
companies (initial market: Karnataka, Kannada-first).

This is a single deployable NestJS application internally organized into
strict, boundary-enforced domain modules — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for why, and §6 in
particular for the rules that keep it that way as it grows.

## Documentation

| What you need | Where |
|---|---|
| System design, module boundaries, phasing, tech stack | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Source business requirements | [`docs/brd_extracted.md`](docs/brd_extracted.md) |
| API reference, per module (for frontend integration) | [`docs/api/*.md`](docs/api/) |
| Machine-readable API spec | [`docs/api/openapi.json`](docs/api/openapi.json) — regenerate with `npm run docs:openapi`; also live at `GET /api/docs` (Swagger UI) on any running environment |
| Implementation rationale, per module (for backend engineers) | [`docs/modules/*_IMPLEMENTATION.md`](docs/modules/) |

**Built so far — Phase 1a, complete** (`docs/ARCHITECTURE.md` §5.3): Auth,
IAM, Customer, Provider, Agent, Provider Onboarding, Service Catalogue,
Geography, Serviceability, Provider Offering & Pricing, Availability,
Booking, Payment, Audit + Notification. Each has a matching `docs/api/`
and `docs/modules/` pair — start there before reading source for any
given module.

If a module's doc and its code ever disagree, the code wins — these are
kept up to date by convention, not generated from source.

## Project setup

```bash
npm install
cp .env.example .env   # fill in secrets; local Postgres via docker-compose.yml
```

## Database

```bash
npx prisma migrate dev   # applies migrations, generates the Prisma client
npm run db:seed          # seeds the IAM permission catalog + SUPER_ADMIN role
```

Schema-per-domain in a single Postgres database (`auth`, `marketplace`,
`finance`, `ops` — see `docs/ARCHITECTURE.md` §7.1). `prisma/schema.prisma`
is the single source of truth; `prisma.config.ts` holds the CLI/migrate
connection.

## Running

```bash
npm run start:dev    # watch mode
npm run start         # single run
npm run start:prod    # runs the compiled dist/main.js
```

Local Postgres via `docker-compose.yml`; `docker-compose.prod.yml` +
`Dockerfile` are for a production-style container build.

## Testing

```bash
npm test              # unit tests
npm run test:cov      # unit tests with coverage
npm run test:e2e      # e2e tests
```

## Linting & type-checking

```bash
npm run lint
npx tsc -p tsconfig.build.json --noEmit
```
