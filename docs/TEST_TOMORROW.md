# SevaMitra – laptop test checklist

## 1. Install
From repository root:
```bash
git checkout develop
git pull
corepack enable
pnpm install
```

## 2. Backend configuration
Copy `.env.example` values into your local environment and set the real backend URL.

Windows PowerShell example:
```powershell
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:8080"
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR_LAPTOP_LAN_IP:8080"
```
For a physical phone, do not use localhost for the API; use the laptop LAN IP and keep phone/laptop on the same network.

## 3. Web
```bash
pnpm dev:web
```
Open http://localhost:3000. Test Home, /marketplace, /login, /provider, /agent and /admin.

## 4. Mobile
```bash
pnpm dev:mobile
```
Open with Expo Go / Android emulator. Test home, marketplace and login.

## 5. Expected integration behaviour
Catalogue screens use live `/api/v1/services` when reachable and display a clearly labelled demo catalogue when backend is offline. OTP login requires a working backend. Booking/payment/settlement confirmation must never be faked client-side.

## 6. Quality gate
Before merge:
```bash
pnpm typecheck
pnpm --filter @sevamitra/web build
```
