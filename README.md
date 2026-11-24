# SevaMitra

Production monorepo for the SevaMitra web and mobile applications.

## Apps
- `apps/web` — Next.js + TypeScript
- `apps/mobile` — React Native + Expo + TypeScript

## Shared packages
- `packages/api-client` — typed API client
- `packages/i18n` — English/Kannada localization
- `packages/contracts` — shared domain contracts

Local services. Stronger communities.

## Technical documentation, deployment, migrations and KT

Start with the [SevaMitra architecture](docs/ARCHITECTURE.md) and [technical handover pack](docs/handbook/README.md).
The pack includes Mermaid deployment/component/ER diagrams, an automatically generated
52-model database catalogue, safe migration/backup/restore scripts, operations and security
runbooks, API reference, training walkthrough and UAT/release gate checklist.
The documentation is versioned against `develop`; open PRs #37 and #38 are not silently
assumed deployed. Do not enable payments, modify a shared database, or treat CI as UAT
without separate approval and evidence.
