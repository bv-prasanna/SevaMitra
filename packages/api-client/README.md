# SevaMitra API client

Shared API transport for web and React Native. It implements every logical endpoint listed in **SevaMitra API Architecture & API Catalogue v1.0**.

## Contract rules
- Base path: `/api/v1`
- JSON
- Bearer access token
- query helpers omit null/undefined values
- retry-sensitive commands accept `RequestOptions.idempotencyKey`
- server error envelope is normalized to `ApiError`

## Important
The source catalogue defines endpoint methods/paths/purpose but does **not** define complete request and response schemas for every endpoint. Such payloads intentionally remain `unknown` until the backend OpenAPI contract is available. Do not invent DTO fields in the client.

The catalogue also states that financial/real-time availability decisions remain server validated.
