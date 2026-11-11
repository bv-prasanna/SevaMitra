# SevaMitra mobile app — four-role UAT guide

**One Expo/React Native application**, not four APKs. The customer, provider,
agent and onboarding-admin menus are decided by a JWT-protected
`GET /api/v1/auth/workspaces` response. Role checks on API actions remain
separate and mandatory. The menu includes **only registered roles** plus
optional provider/agent onboarding links. Admin appears only when the
account has `provider.onboarding.review` or the system super-admin wildcard.

## Where to test
- **Developer test:** install Expo Go (if compatible with the project's Expo SDK),
  run the local Expo server and scan the terminal QR code on the phone.
- **Team test:** create an Android `preview` APK using Expo EAS Build, and share
  its restricted internal build link. An iOS preview requires Apple signing
  and internal-device provisioning.
- **Browser web equivalents:** `/login`, `/workspaces`, `/customer`,
  `/provider`, `/agent`, `/admin`.

### Local Android on your Windows development computer
You must have Node/pnpm, the repository, and a **reachable backend** already
configured. The API base must be the origin, not a path ending in `/api/v1`.
```powershell
git clone https://github.com/bv-prasanna/SevaMitra.git
cd SevaMitra
git checkout develop
corepack enable
pnpm install --frozen-lockfile
cd apps/mobile
$env:EXPO_PUBLIC_API_BASE_URL="https://api-staging.YOUR-DOMAIN"
npx expo start --tunnel
```
Scan the QR code with Expo Go if that SDK version is supported. On Windows,
the iOS simulator is not available. Do not use `localhost` as the API URL
on a physical device; `localhost` means the phone itself.

### Android APK for a group of testers
The project has `apps/mobile/eas.json` with the `preview` profile. Link it
to your Expo account and configure the preview environment's
`EXPO_PUBLIC_API_BASE_URL=https://api-staging.YOUR-DOMAIN`.
```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```
After the EAS build succeeds, open the internal test build URL displayed by
EAS and install the APK on a test Android device. A successful GitHub typecheck
does **not** create an APK. Google Play release and iOS store submission are
separate steps and are not required for private Android UAT.

## Accounts for role testing
| Account | Setup | Visible authorized workspaces |
|---|---|---|
| Customer | Sign in via OTP; create customer profile | Customer |
| Provider | Sign in via OTP; register provider profile, submit KYC | Customer + Provider (pending profile can finish verification) |
| Agent | Sign in via OTP; create agent profile | Customer + Agent |
| Admin | Sign in via OTP; assign actual IAM reviewer/super-admin role | Customer + Admin |
| Mixed-role | Register multiple profiles / appropriate IAM grants on same user | Relevant combined menus |

The first Admin must **log in once** before seeding a bootstrap assignment.
In a trusted admin environment, set `IAM_BOOTSTRAP_ADMIN_PHONE` (or email)
to that existing test user and run `npm run db:seed` in `apps/backend`.
The seed script upserts the system super-admin role and creates the
assignment. This is a privileged operation: do **not** put test admin
bootstrap credentials in a public environment or Git.

## Manual role UAT
1. Customer account → `/workspaces`: Customer menu, optional "Apply as
   provider/agent", **no Admin**. Provider/admin protected APIs must deny access.
2. Provider account → Provider menu. Unverified user can upload private KYC
   and track approval, but cannot publish serviceable offers until approved.
3. Agent account → Agent menu. Referral code appears; agent must not see Admin.
4. Authorized reviewer → Admin menu. Review a provider application.
5. Same user with Provider + Agent → both are shown, and switching works.
6. Suspended/revoked admin role → refresh menu and confirm Admin disappears.
   Sign out/back in on stale JWTs and verify API guards still deny access.
7. All four users sign out and sign in with another phone number, and ensure
   personal bookings, notifications and provider profiles never leak across users.
8. Exercise Android back button, keyboard, offline/API errors and OTP cooldown.

### Known limits
- The admin workspace in this slice covers onboarding review; it is not
  a complete mobile platform-administration console.
- Role/profile membership is checked to **display** a workspace; API
  permission checks determine the actions actually allowed.
- Test build availability and externally hosted staging API must be
  verified independently; no build has been published by writing this guide.
