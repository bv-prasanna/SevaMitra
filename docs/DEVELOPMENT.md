# SevaMitra development

## Prerequisites
- Node.js 22+
- pnpm 10+

## Install
```bash
pnpm install
cp .env.example .env.local
```

## Web
```bash
pnpm dev:web
```

## Mobile
```bash
pnpm dev:mobile
```

The mobile app defaults to Kannada and can switch to English. The web app defaults to English and can switch to Kannada.

## Architecture
The frontend is a pnpm monorepo. Web and mobile keep platform-appropriate UI while sharing API contracts, localization, validation and domain utilities. The shared API client targets the backend under `/api/v1`.

## Performance rules
- Keep mobile screens lightweight and virtualize long lists.
- Cache read-mostly catalogue/geography data.
- Compress images and avoid large animation dependencies.
- Never treat an offline booking/payment mutation as confirmed until the server accepts it.
- Use explicit loading, empty, offline and error states.
