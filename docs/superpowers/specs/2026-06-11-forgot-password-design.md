# Forgot Password — Design Spec

**Date:** 2026-06-11
**Status:** Approved, ready for implementation planning

## Summary

Add a self-service password reset flow to the LOL Chess app. A user who forgets
their password requests a reset by email, receives a one-time link, and sets a
new password. Delivery uses real email via nodemailer (generic SMTP), falling
back to an Ethereal test inbox in local dev.

## Goals

- Let users reset a forgotten password without admin intervention.
- Use real email delivery, provider-agnostic, testable locally with zero signup.
- Follow security best practices: hashed single-use tokens, short expiry, and
  email-enumeration protection.

## Non-goals (YAGNI)

- Rate limiting / throttling of the forgot-password endpoint. Noted as a future
  enhancement (prevents email-bombing) but intentionally out of scope now.
- "Remember me", account lockout, 2FA, or any change to the existing login flow.
- Changing username — reset is keyed on email only.

## Decisions (from brainstorming)

1. **Delivery:** real email (not dev-only logging, not security questions).
2. **Reset mechanism:** emailed **link** to a frontend reset page (not a code).
3. **Email transport:** generic SMTP via nodemailer + env vars; **Ethereal**
   auto-fallback for dev (no SMTP config → throwaway inbox + console preview URL).
4. **Token:** random 32-byte hex, stored only as a SHA-256 hash, single-use,
   1-hour expiry.
5. **Enumeration protection:** forgot-password always returns the same generic
   success response regardless of whether the email matches an account.

## Current state (context)

- Backend: NestJS + Passport + JWT, bcrypt (salt rounds 10), MongoDB/Mongoose.
  - `apps/backend/src/auth/auth.controller.ts` — `POST /auth/login`,
    `POST /auth/register`, `GET /auth/me`.
  - `apps/backend/src/auth/auth.service.ts` — validation, registration, tokens.
  - `apps/backend/src/users/user.schema.ts` — User schema with separate
    `username` and `email` fields.
  - `ConfigModule` (global) reads `apps/backend/.env`.
- Frontend: React + Redux Toolkit, REST via axios.
  - `apps/frontend/src/pages/LoginPage.tsx`, `RegisterPage.tsx`.
  - `apps/frontend/src/store/authSlice.ts` — `loginUser`, `registerUser`,
    `getCurrentUser` thunks; token in `localStorage`.
- **No email service exists today** — this spec introduces the first one.

## Design

### 1. Data model

Add two optional fields to the User schema (`user.schema.ts`):

- `resetPasswordTokenHash?: string` — SHA-256 hex hash of the raw reset token.
  The raw token is never persisted.
- `resetPasswordExpires?: Date` — expiry timestamp (now + 1 hour).

Both fields are cleared after a successful reset.

### 2. Backend — MailModule

New module at `apps/backend/src/mail/`:

- `MailModule` (global or imported by AuthModule) wrapping nodemailer.
- Transport configured from env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASS`, `SMTP_FROM`. If `SMTP_HOST` is unset, create an Ethereal test
  account at startup (or lazily) and log the message preview URL after each send.
- `MailService.sendPasswordResetEmail(to: string, resetUrl: string)` — sends a
  simple HTML + text email containing the reset link.

### 3. Backend — endpoints

Both added to `auth.controller.ts` / `auth.service.ts`:

- **`POST /auth/forgot-password`** — body `{ email }`.
  - Look up user by email.
  - If found: generate raw token (`crypto.randomBytes(32).toString('hex')`),
    store its SHA-256 hash + expiry on the user, and email
    `${FRONTEND_URL}/reset-password?token=<rawToken>`.
  - Always return `200` with a generic message
    (`"If an account exists for that email, a reset link has been sent."`),
    whether or not the email matched.

- **`POST /auth/reset-password`** — body `{ token, newPassword }`.
  - Hash the incoming token, find a user whose `resetPasswordTokenHash` matches
    and whose `resetPasswordExpires` is in the future.
  - If none: return a generic error (`400` — invalid or expired token).
  - If found: bcrypt-hash `newPassword` (salt rounds 10), save, clear both reset
    fields. Return success. (No auto-login; user proceeds to log in.)
  - Validate `newPassword` length (>= 6) to match register rules.

### 4. Frontend

- **LoginPage:** add a **"Forgot password?"** link beneath the password field,
  routing to `/forgot-password`. Styling mirrors the existing "Register here"
  link.
- **`/forgot-password` page** (`pages/ForgotPasswordPage.tsx`): single email
  field (react-hook-form, email validation) → `requestPasswordReset` thunk →
  show the generic confirmation message on success regardless of outcome.
- **`/reset-password` page** (`pages/ResetPasswordPage.tsx`): read `token` from
  the query string. New-password + confirm-password fields (>= 6 chars, must
  match) → `resetPassword` thunk → on success show confirmation and redirect to
  `/login`. Invalid/expired token (or missing token) shows an error with a link
  back to `/forgot-password`.
- **authSlice:** two new thunks — `requestPasswordReset({ email })` →
  `POST /auth/forgot-password`, and `resetPassword({ token, newPassword })` →
  `POST /auth/reset-password`. Neither mutates auth state (`user`/`token`/
  `isAuthenticated`); they only drive per-form loading/error/success. Add routes
  for both pages to the router.

### 5. Env vars (new, all optional)

`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Absent in dev →
Ethereal fallback. Document them in `.env` (and any `.env.example`).

### 6. Testing

Backend `*.spec.ts` covering `auth.service`:

- Forgot-password generates a token, stores a hash (not the raw token), and sets
  a ~1-hour expiry.
- Forgot-password for an unknown email returns the same generic response and
  does not throw (enumeration-safe).
- Reset-password with a valid, unexpired token updates the password (bcrypt hash
  changes) and clears the reset fields.
- Reset-password with an expired token is rejected.
- Reset-password with a wrong/unknown token is rejected.
- MailService is mocked in tests (no real SMTP).

## Build order reminder

Pure auth/mail changes live in `apps/backend` (not the engine packages), so the
engine rebuild chain is not required here — just build/test the backend and
build the frontend.

## Future enhancements (out of scope)

- Rate-limiting / throttling `POST /auth/forgot-password`.
- Invalidating existing sessions on password change.
- Branded HTML email template.
