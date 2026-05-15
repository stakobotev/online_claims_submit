# API Contract

Base URL: `/api`. All bodies are `application/json` unless noted. All responses are JSON. Errors use the envelope:

```json
{ "error": { "code": "STRING_CODE", "message": "Human readable", "details": { } } }
```

Standard codes: `VALIDATION_ERROR`, `AUTH_INVALID_CREDENTIALS`, `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `CAPTCHA_FAILED`, `CONFLICT`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `INTERNAL`.

Auth: bearer token in `Authorization: Authorization: Bearer <access>`. Refresh token in HttpOnly cookie `refresh_token`.

---

## Auth

### POST /api/auth/register
Public. Body:
```json
{
  "email": "user@example.com",
  "name": "Jane Doe",
  "password": "Str0ng!Password",
  "passwordConfirmation": "Str0ng!Password",
  "captchaToken": "string",
  "consents": { "termsVersion": "1.0", "privacyVersion": "1.0", "marketing": false }
}
```
Returns `201 { "userId": "...", "status": "pending_confirmation" }`. Triggers verification email.

### GET /api/auth/verify-email?token=...
Public. Activates the user; returns `200 { "status": "active" }` or redirects to frontend route.

### POST /api/auth/resend-verification
Public. Body `{ "email" }`. Rate-limited.

### POST /api/auth/login
Public. Body `{ "email", "password", "captchaToken?" }`. Returns:
```json
{
  "accessToken": "jwt",
  "user": { "id": "...", "email": "...", "name": "...", "role": "user|admin" }
}
```
Sets `refresh_token` HttpOnly cookie.

### POST /api/auth/refresh
Public (uses cookie). Rotates refresh token, returns new access token.

### POST /api/auth/logout
Authenticated. Revokes refresh token, clears cookie.

### POST /api/auth/forgot-password
Public. Body `{ "email", "captchaToken" }`. Always returns 200 (no enumeration).

### POST /api/auth/reset-password
Public. Body `{ "token", "password", "passwordConfirmation" }`.

### GET /api/auth/oauth/google
Public. Redirects to Google.

### GET /api/auth/oauth/google/callback
Public. Exchanges code, creates or links user, redirects to frontend with one-shot code.

### GET /api/auth/oauth/facebook  &  /api/auth/oauth/facebook/callback
Same as Google.

### POST /api/auth/oauth/exchange
Public. Body `{ "code" }`. Returns same shape as `/login`.

---

## Me / Users

### GET /api/me
Authenticated. Returns the current user profile (read-only).

### GET /api/admin/users
Admin. Query: `?q=&role=&status=&page=&size=`. Paginated.

### PATCH /api/admin/users/:id
Admin. Body `{ "role?", "status?" }` (status one of `active|blocked|deactivated`).

### POST /api/admin/users/:id/anonymize
Admin (GDPR right-to-be-forgotten). Returns `200 { "anonymized": true }`.

---

## Categories

### GET /api/categories
Public. Returns the fixed list:
```json
[
  { "id": "hospitals", "name": "Hospitals" },
  { "id": "doctors", "name": "Doctors" },
  { "id": "insurance_funds", "name": "Health Insurance Funds" }
]
```

---

## Institutions

### GET /api/institutions
Public. Query: `?category=hospitals&q=&page=&size=`. Returns active institutions only.

### POST /api/admin/institutions
Admin. Body `{ "categoryId", "name", "email" }`.

### PATCH /api/admin/institutions/:id
Admin. Body partial.

### DELETE /api/admin/institutions/:id
Admin. Soft delete (`active=false`).

---

## Complaints

### POST /api/complaints
Public (anonymous OR authenticated).

`multipart/form-data` (because of attachments) with fields:
- `categoryId` (required)
- `institutionId` (optional — one of `institutionId` or `institutionFreeText` required)
- `institutionFreeText` (optional)
- `title` (required)
- `body` (required, ≥ configurable `MIN_BODY_LENGTH`, default 100)
- `urgent` (boolean, optional)
- `contactName` (optional)
- `contactEmail` (optional, email format)
- `captchaToken` (required when unauthenticated)
- `attachments[]` (optional; max 3 files; 5MB combined; allowed types PDF, BMP, JPG, JPEG, TIFF, PNG)

Response `201`:
```json
{
  "publicId": "VLC-2026-000123",
  "status": "submitted|pending_review",
  "message": "..." // localized confirmation
}
```

### GET /api/complaints
Authenticated user: returns the caller's own complaints. Admin: returns all.

Query (admin only): `?q=&category=&institutionId=&status=&from=&to=&urgent=&page=&size=`.

Paginated response envelope for all list endpoints:
```json
{ "data": [/* items */], "page": 1, "size": 20, "total": 123, "pages": 7 }
```

### GET /api/complaints/:publicId
Owner or admin only. Anonymous submissions cannot be retrieved.

### POST /api/admin/complaints/:publicId/approve
Admin. Moves PendingReview → Approved (triggers forwarding to institution + Ombudsman).

### POST /api/admin/complaints/:publicId/reject
Admin. Body `{ "reason" }`. Moves PendingReview → Rejected.

### PATCH /api/admin/complaints/:publicId/status
Admin. Body `{ "status": "closed" }`. Only `forwarded` → `closed` is valid through this endpoint.

### GET /api/admin/complaints/:publicId/events
Admin. Returns audit trail / status timeline.

---

## Attachments

### GET /api/attachments/:id
Owner or admin only. Streams the file with appropriate `Content-Type` and `Content-Disposition`.

(Uploads are part of the complaint POST — there is no separate upload endpoint.)

---

## Statistics

### GET /api/statistics/summary
Public (the BRD lists a homepage stats summary). Returns aggregate counts only — never PII:
```json
{
  "totalComplaints": 1234,
  "totalForwarded": 1200,
  "byCategory": [ { "id": "hospitals", "count": 800 }, ... ],
  "byUrgency": { "urgent": 100, "normal": 1134 }
}
```

### GET /api/admin/statistics/detail
Admin. Adds breakdowns by institution, by status, by month, by submission type (auth vs anon).

### GET /api/admin/statistics/export
Admin. Query `?format=csv|pdf&from=&to=`. Returns the file.

---

## Search

### GET /api/admin/complaints/search
Admin. Free-text + filters: `?q=&category=&institutionId=&status=&from=&to=&page=&size=`. Backed by Postgres `tsvector` index on `title` + `body`.

---

## Config endpoints (for FE)

### GET /api/config/public
Public. Returns runtime config the FE needs:
```json
{
  "minBodyLength": 100,
  "maxAttachments": 3,
  "maxAttachmentTotalBytes": 5242880,
  "allowedAttachmentMime": ["application/pdf", "image/bmp", "image/jpeg", "image/png", "image/tiff"],
  "captchaSiteKey": "...",
  "oauthProviders": ["google", "facebook"],
  "locales": ["en", "bg"]
}
```

---

## HTTP status conventions

- `200 OK` — successful read/update.
- `201 Created` — successful create.
- `204 No Content` — successful delete or void action.
- `400 VALIDATION_ERROR` — Zod-validated body failure.
- `401 AUTH_REQUIRED` / `AUTH_INVALID_CREDENTIALS` — missing or bad credentials.
- `403 FORBIDDEN` — RBAC denial.
- `404 NOT_FOUND` — resource missing (or hidden by access scope).
- `409 CONFLICT` — uniqueness violations.
- `413 PAYLOAD_TOO_LARGE` — attachments exceed 5MB / 3 files.
- `415 UNSUPPORTED_MEDIA_TYPE` — wrong attachment type.
- `429 RATE_LIMITED` — rate-limit / abuse protection.
- `500 INTERNAL` — unhandled; logged with request id.

Every response includes header `X-Request-Id: <uuid>` for tracing.
