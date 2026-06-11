# Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user reset a forgotten password via an emailed, single-use, 1-hour reset link.

**Architecture:** Backend (NestJS) gains a `MailModule` (nodemailer, Ethereal fallback in dev) and two `AuthController`/`AuthService` endpoints. The User schema stores a hashed reset token + expiry. Frontend (React/Redux) gains two new pages (`/forgot-password`, `/reset-password`), two `authSlice` thunks, and a "Forgot password?" link on the login page.

**Tech Stack:** NestJS, Mongoose/MongoDB, bcrypt, Node `crypto`, nodemailer, Jest; React, Redux Toolkit, react-hook-form, styled-components, react-router-dom.

---

## Notes for the implementer

- **Node 22:** run `fnm use v22` before any command (verify `node --version`).
- **No dev servers.** Build and test only; the user runs dev servers.
- **Build order:** these changes live entirely in `apps/backend` and `apps/frontend` — the engine packages (`game-engine`, `bot-engine`) are NOT touched, so the engine rebuild chain is not needed.
- The codebase intentionally avoids class-validator DTO classes on auth routes (uses inline `@Body()` type literals). Match that style.
- The codebase casts Mongoose docs with `as any` to read `_id`. Match that style.
- Frontend has no test runner configured; frontend tasks verify via typecheck/build, not unit tests. Backend logic is covered by a Jest spec.

---

## File Structure

**Backend — create:**
- `apps/backend/src/mail/mail.module.ts` — DI module exporting `MailService`.
- `apps/backend/src/mail/mail.service.ts` — nodemailer wrapper; `sendPasswordResetEmail`.
- `apps/backend/src/auth/auth.service.spec.ts` — unit tests for new reset logic.

**Backend — modify:**
- `apps/backend/src/users/user.schema.ts` — add `resetPasswordTokenHash`, `resetPasswordExpires`.
- `apps/backend/src/users/users.service.ts` — add `findByResetTokenHash`.
- `apps/backend/src/auth/auth.service.ts` — add `forgotPassword`, `resetPassword`.
- `apps/backend/src/auth/auth.controller.ts` — add two POST routes.
- `apps/backend/src/auth/auth.module.ts` — import `MailModule`.
- `apps/backend/.env` — document new `SMTP_*` vars.

**Frontend — create:**
- `apps/frontend/src/pages/ForgotPasswordPage.tsx`
- `apps/frontend/src/pages/ResetPasswordPage.tsx`

**Frontend — modify:**
- `apps/frontend/src/store/authSlice.ts` — add `requestPasswordReset`, `resetPassword` thunks + reducers.
- `apps/frontend/src/pages/LoginPage.tsx` — add "Forgot password?" link.
- `apps/frontend/src/App.tsx` — register the two new routes.

---

## Task 1: Install nodemailer

**Files:**
- Modify: `apps/backend/package.json` (via npm)

- [ ] **Step 1: Install nodemailer + types**

Run from repo root:
```bash
fnm use v22
npm install nodemailer --workspace=apps/backend
npm install -D @types/nodemailer --workspace=apps/backend
```

- [ ] **Step 2: Verify install**

Run: `node -e "require('nodemailer'); console.log('ok')"` from `apps/backend`, or check `apps/backend/package.json` lists `nodemailer` under dependencies and `@types/nodemailer` under devDependencies.
Expected: `ok` / both entries present.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/package.json package-lock.json
git commit -m "build(backend): add nodemailer for password reset emails"
```

---

## Task 2: Add reset-token fields to the User schema

**Files:**
- Modify: `apps/backend/src/users/user.schema.ts`

- [ ] **Step 1: Add the two optional fields**

In `user.schema.ts`, add these props inside the `User` class, immediately after the `password` prop (before `level`):

```typescript
  @Prop({ required: false, default: null })
  resetPasswordTokenHash?: string;

  @Prop({ required: false, default: null })
  resetPasswordExpires?: Date;
```

- [ ] **Step 2: Build the backend to verify the schema compiles**

Run: `npm run build:backend`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/users/user.schema.ts
git commit -m "feat(backend): add reset-token fields to user schema"
```

---

## Task 3: Add `findByResetTokenHash` to UsersService

**Files:**
- Modify: `apps/backend/src/users/users.service.ts`

- [ ] **Step 1: Add the lookup method**

In `users.service.ts`, import `UserDocument` (update the existing import line) and add a method after `findByEmail`:

Change the import line to:
```typescript
import { User, UserDocument } from './user.schema';
```

Add the method:
```typescript
  async findByResetTokenHash(tokenHash: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ resetPasswordTokenHash: tokenHash }).exec();
  }
```

- [ ] **Step 2: Build the backend**

Run: `npm run build:backend`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/users/users.service.ts
git commit -m "feat(backend): add findByResetTokenHash to users service"
```

---

## Task 4: Create the MailService and MailModule

**Files:**
- Create: `apps/backend/src/mail/mail.service.ts`
- Create: `apps/backend/src/mail/mail.module.ts`

- [ ] **Step 1: Write `mail.service.ts`**

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private from = 'no-reply@lolchess.local';

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10),
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      this.from = this.configService.get<string>('SMTP_FROM') || this.from;
    } else {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      this.logger.warn(
        'No SMTP_HOST configured — using an Ethereal test account. Email preview URLs will be logged.',
      );
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Reset your LOL Chess password',
      text:
        `You requested a password reset.\n\n` +
        `Open this link to set a new password (valid for 1 hour):\n${resetUrl}\n\n` +
        `If you didn't request this, you can safely ignore this email.`,
      html:
        `<p>You requested a password reset.</p>` +
        `<p><a href="${resetUrl}">Click here to set a new password</a> (valid for 1 hour).</p>` +
        `<p>If you didn't request this, you can safely ignore this email.</p>`,
    });

    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      this.logger.log(`Password reset email preview URL: ${preview}`);
    }
  }
}
```

- [ ] **Step 2: Write `mail.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
```

- [ ] **Step 3: Build the backend**

Run: `npm run build:backend`
Expected: build succeeds (note: `MailModule` is not imported anywhere yet — that happens in Task 6; it still compiles).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/mail/
git commit -m "feat(backend): add MailService with nodemailer + Ethereal dev fallback"
```

---

## Task 5: Add `forgotPassword` / `resetPassword` to AuthService (TDD)

**Files:**
- Create: `apps/backend/src/auth/auth.service.spec.ts`
- Modify: `apps/backend/src/auth/auth.service.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/auth/auth.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';

describe('AuthService — password reset', () => {
  let authService: AuthService;
  let usersService: any;
  let mailService: any;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByResetTokenHash: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    };
    mailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') } },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('forgotPassword', () => {
    it('stores a hashed token (not the raw token) with a ~1h expiry and emails a link', async () => {
      usersService.findByEmail.mockResolvedValue({ _id: 'u1', email: 'a@b.com' });

      await authService.forgotPassword('a@b.com');

      expect(usersService.update).toHaveBeenCalledTimes(1);
      const [userId, patch] = usersService.update.mock.calls[0];
      expect(userId).toBe('u1');
      // raw token must not be persisted: stored value is a 64-char sha256 hex
      expect(patch.resetPasswordTokenHash).toMatch(/^[a-f0-9]{64}$/);
      const ttlMs = patch.resetPasswordExpires.getTime() - Date.now();
      expect(ttlMs).toBeGreaterThan(55 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(60 * 60 * 1000);

      // email contains the RAW token in the URL, never the hash
      const [, resetUrl] = mailService.sendPasswordResetEmail.mock.calls[0];
      expect(resetUrl).toContain('/reset-password?token=');
      expect(resetUrl).not.toContain(patch.resetPasswordTokenHash);
    });

    it('is enumeration-safe: unknown email does not throw, updates nothing, sends nothing', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(authService.forgotPassword('nobody@b.com')).resolves.toBeUndefined();

      expect(usersService.update).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('updates the password (bcrypt hash) and clears reset fields for a valid, unexpired token', async () => {
      usersService.findByResetTokenHash.mockResolvedValue({
        _id: 'u1',
        resetPasswordExpires: new Date(Date.now() + 30 * 60 * 1000),
      });

      await authService.resetPassword('rawtoken', 'newpassword');

      const [userId, patch] = usersService.update.mock.calls[0];
      expect(userId).toBe('u1');
      expect(patch.resetPasswordTokenHash).toBeNull();
      expect(patch.resetPasswordExpires).toBeNull();
      expect(await bcrypt.compare('newpassword', patch.password)).toBe(true);
    });

    it('rejects an expired token', async () => {
      usersService.findByResetTokenHash.mockResolvedValue({
        _id: 'u1',
        resetPasswordExpires: new Date(Date.now() - 1000),
      });

      await expect(authService.resetPassword('rawtoken', 'newpassword')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('rejects an unknown token', async () => {
      usersService.findByResetTokenHash.mockResolvedValue(null);

      await expect(authService.resetPassword('rawtoken', 'newpassword')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(usersService.update).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=apps/backend -- auth.service.spec`
Expected: FAIL — `authService.forgotPassword is not a function` (methods not implemented yet).

- [ ] **Step 3: Implement the methods**

In `apps/backend/src/auth/auth.service.ts`:

Update the top imports (add `BadRequestException`, `crypto`, and `MailService`):
```typescript
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
```

Inject `MailService` in the constructor (add the parameter):
```typescript
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}
```

Add these two methods at the end of the class (after `register`):
```typescript
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    // Enumeration-safe: silently return when no account matches.
    if (!user) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const userId = (user as any)._id.toString();
    await this.usersService.update(userId, {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: expires,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByResetTokenHash(tokenHash);

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const userId = (user as any)._id.toString();
    await this.usersService.update(userId, {
      password: hashedPassword,
      resetPasswordTokenHash: null,
      resetPasswordExpires: null,
    });
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=apps/backend -- auth.service.spec`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/auth/auth.service.ts apps/backend/src/auth/auth.service.spec.ts
git commit -m "feat(backend): add forgotPassword/resetPassword logic with tests"
```

---

## Task 6: Wire the controller routes and module import

**Files:**
- Modify: `apps/backend/src/auth/auth.controller.ts`
- Modify: `apps/backend/src/auth/auth.module.ts`

- [ ] **Step 1: Add the two routes to the controller**

In `auth.controller.ts`, add these two methods after `register` (before `getProfile`):

```typescript
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.forgotPassword(body.email);
    // Always generic — never reveal whether the email exists.
    return {
      message: 'If an account exists for that email, a password reset link has been sent.',
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { message: 'Password has been reset successfully.' };
  }
```

- [ ] **Step 2: Import MailModule in AuthModule**

In `auth.module.ts`, add the import at the top:
```typescript
import { MailModule } from '../mail/mail.module';
```

Add `MailModule` to the `imports` array (after `UsersModule`):
```typescript
  imports: [
    UsersModule,
    MailModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'lolchess-jwt-secret-key-2025',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
```

- [ ] **Step 3: Build the backend**

Run: `npm run build:backend`
Expected: build succeeds (AuthService now resolves its `MailService` dependency via the imported `MailModule`).

- [ ] **Step 4: Run the full backend test suite**

Run: `npm run test --workspace=apps/backend`
Expected: PASS — existing tests plus the new `auth.service.spec` all green.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/auth/auth.controller.ts apps/backend/src/auth/auth.module.ts
git commit -m "feat(backend): expose forgot-password and reset-password endpoints"
```

---

## Task 7: Document the new env vars

**Files:**
- Modify: `apps/backend/.env`

- [ ] **Step 1: Append SMTP config block**

Add to `apps/backend/.env` (these are optional; absent → Ethereal dev fallback):
```
# Email (password reset). Leave SMTP_HOST unset in dev to use an Ethereal test inbox.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@lolchess.local
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/.env
git commit -m "docs(backend): document SMTP env vars for password reset"
```

---

## Task 8: Add frontend Redux thunks

**Files:**
- Modify: `apps/frontend/src/store/authSlice.ts`

- [ ] **Step 1: Add the two thunks**

In `authSlice.ts`, add after the `registerUser` thunk (before `getCurrentUser`):

```typescript
export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async ({ email }: { email: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { email })
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Request failed')
    }
  }
)

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }: { token: string; newPassword: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, { token, newPassword })
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Password reset failed')
    }
  }
)
```

- [ ] **Step 2: Add reducer cases for loading/error only (no auth mutation)**

In `authSlice.ts`, inside `extraReducers`, add after the `getCurrentUser.rejected` case (still inside the `builder` chain):

```typescript
      // Request password reset
      .addCase(requestPasswordReset.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string || 'Request failed'
      })
      // Reset password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string || 'Password reset failed'
      })
```

(These deliberately do not touch `user`/`token`/`isAuthenticated` — reset is not a login. Pages drive their own success UI via `.unwrap()`.)

- [ ] **Step 3: Typecheck/build the frontend**

Run: `npm run build:frontend`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/store/authSlice.ts
git commit -m "feat(frontend): add password-reset Redux thunks"
```

---

## Task 9: Create the ForgotPasswordPage

**Files:**
- Create: `apps/frontend/src/pages/ForgotPasswordPage.tsx`

- [ ] **Step 1: Write the page**

Create `apps/frontend/src/pages/ForgotPasswordPage.tsx`:

```tsx
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { KeyRound, Mail } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { requestPasswordReset } from '../store/authSlice'

const Container = styled.div`
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
`

const Card = styled(motion.div)`
  background: var(--secondary-bg);
  padding: 40px;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
`

const Title = styled.h1`
  text-align: center;
  color: var(--primary-text);
  margin-bottom: 10px;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;

  .icon {
    color: var(--gold);
  }
`

const Subtitle = styled.p`
  text-align: center;
  color: var(--secondary-text);
  margin-bottom: 30px;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    color: var(--primary-text);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;

    .icon {
      color: var(--gold);
    }
  }
`

const Input = styled.input`
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 6px;
  background: var(--primary-bg);
  color: var(--primary-text);
  font-size: 16px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(200, 155, 60, 0.1);
  }

  &::placeholder {
    color: var(--secondary-text);
  }
`

const ErrorMessage = styled.span`
  color: var(--red);
  font-size: 14px;
`

const SubmitButton = styled(motion.button)`
  background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
  color: var(--primary-bg);
  padding: 16px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const BackLink = styled.div`
  text-align: center;
  margin-top: 20px;
  color: var(--secondary-text);

  a {
    color: var(--gold);
    text-decoration: none;
    font-weight: bold;

    &:hover {
      color: var(--hover);
    }
  }
`

const Confirmation = styled.p`
  text-align: center;
  color: var(--primary-text);
  line-height: 1.6;
`

interface ForgotFormData {
  email: string
}

const ForgotPasswordPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotFormData>()
  const { loading } = useAppSelector(state => state.auth)
  const dispatch = useAppDispatch()
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = async (data: ForgotFormData) => {
    try {
      await dispatch(requestPasswordReset(data)).unwrap()
      setSubmitted(true)
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Request failed')
    }
  }

  return (
    <Container>
      <Card
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Title>
          <KeyRound className="icon" size={32} />
          Forgot Password
        </Title>

        {submitted ? (
          <>
            <Confirmation>
              If an account exists for that email, we&apos;ve sent a password reset link.
              Check your inbox and follow the link to set a new password.
            </Confirmation>
            <BackLink>
              <Link to="/login">Back to Login</Link>
            </BackLink>
          </>
        ) : (
          <>
            <Subtitle>Enter your email and we&apos;ll send you a reset link.</Subtitle>
            <Form onSubmit={handleSubmit(onSubmit)}>
              <InputGroup>
                <label>
                  <Mail className="icon" size={18} />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address',
                    },
                  })}
                />
                {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
              </InputGroup>

              <SubmitButton
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </SubmitButton>
            </Form>

            <BackLink>
              Remembered it? <Link to="/login">Back to Login</Link>
            </BackLink>
          </>
        )}
      </Card>
    </Container>
  )
}

export default ForgotPasswordPage
```

- [ ] **Step 2: Typecheck/build the frontend**

Run: `npm run build:frontend`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/ForgotPasswordPage.tsx
git commit -m "feat(frontend): add forgot-password page"
```

---

## Task 10: Create the ResetPasswordPage

**Files:**
- Create: `apps/frontend/src/pages/ResetPasswordPage.tsx`

- [ ] **Step 1: Write the page**

Create `apps/frontend/src/pages/ResetPasswordPage.tsx`:

```tsx
import React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { resetPassword } from '../store/authSlice'

const Container = styled.div`
  min-height: calc(100vh - 200px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
`

const Card = styled(motion.div)`
  background: var(--secondary-bg);
  padding: 40px;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
`

const Title = styled.h1`
  text-align: center;
  color: var(--primary-text);
  margin-bottom: 10px;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;

  .icon {
    color: var(--gold);
  }
`

const Subtitle = styled.p`
  text-align: center;
  color: var(--secondary-text);
  margin-bottom: 30px;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    color: var(--primary-text);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;

    .icon {
      color: var(--gold);
    }
  }
`

const Input = styled.input`
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 6px;
  background: var(--primary-bg);
  color: var(--primary-text);
  font-size: 16px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--gold);
    box-shadow: 0 0 0 3px rgba(200, 155, 60, 0.1);
  }

  &::placeholder {
    color: var(--secondary-text);
  }
`

const ErrorMessage = styled.span`
  color: var(--red);
  font-size: 14px;
`

const SubmitButton = styled(motion.button)`
  background: linear-gradient(135deg, var(--gold) 0%, #b8860b 100%);
  color: var(--primary-bg);
  padding: 16px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const BackLink = styled.div`
  text-align: center;
  margin-top: 20px;
  color: var(--secondary-text);

  a {
    color: var(--gold);
    text-decoration: none;
    font-weight: bold;

    &:hover {
      color: var(--hover);
    }
  }
`

const Notice = styled.p`
  text-align: center;
  color: var(--primary-text);
  line-height: 1.6;
`

interface ResetFormData {
  newPassword: string
  confirmPassword: string
}

const ResetPasswordPage: React.FC = () => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetFormData>()
  const { loading } = useAppSelector(state => state.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const onSubmit = async (data: ResetFormData) => {
    if (!token) return
    try {
      await dispatch(resetPassword({ token, newPassword: data.newPassword })).unwrap()
      toast.success('Password reset! Please log in with your new password.')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Password reset failed')
    }
  }

  if (!token) {
    return (
      <Container>
        <Card
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Title>
            <ShieldCheck className="icon" size={32} />
            Reset Password
          </Title>
          <Notice>
            This password reset link is invalid or incomplete.
          </Notice>
          <BackLink>
            <Link to="/forgot-password">Request a new link</Link>
          </BackLink>
        </Card>
      </Container>
    )
  }

  return (
    <Container>
      <Card
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Title>
          <ShieldCheck className="icon" size={32} />
          Reset Password
        </Title>
        <Subtitle>Choose a new password for your account.</Subtitle>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <InputGroup>
            <label>
              <Lock className="icon" size={18} />
              New Password
            </label>
            <Input
              type="password"
              placeholder="Enter a new password"
              {...register('newPassword', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
            {errors.newPassword && <ErrorMessage>{errors.newPassword.message}</ErrorMessage>}
          </InputGroup>

          <InputGroup>
            <label>
              <Lock className="icon" size={18} />
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Re-enter your new password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === watch('newPassword') || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>}
          </InputGroup>

          <SubmitButton
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </SubmitButton>
        </Form>

        <BackLink>
          <Link to="/login">Back to Login</Link>
        </BackLink>
      </Card>
    </Container>
  )
}

export default ResetPasswordPage
```

- [ ] **Step 2: Typecheck/build the frontend**

Run: `npm run build:frontend`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/pages/ResetPasswordPage.tsx
git commit -m "feat(frontend): add reset-password page"
```

---

## Task 11: Add the login link and register the routes

**Files:**
- Modify: `apps/frontend/src/pages/LoginPage.tsx`
- Modify: `apps/frontend/src/App.tsx`

- [ ] **Step 1: Add a "Forgot password?" link to LoginPage**

In `LoginPage.tsx`, add a styled component after the `RegisterLink` definition (around line 129):

```tsx
const ForgotLink = styled.div`
  text-align: center;
  margin-top: 12px;

  a {
    color: var(--secondary-text);
    text-decoration: none;
    font-size: 14px;

    &:hover {
      color: var(--gold);
    }
  }
`
```

Then add the link element immediately after the closing `</Form>` tag and before `<RegisterLink>` (around line 210):

```tsx
        <ForgotLink>
          <Link to="/forgot-password">Forgot password?</Link>
        </ForgotLink>
```

(`Link` is already imported in `LoginPage.tsx`.)

- [ ] **Step 2: Register the routes in App.tsx**

In `App.tsx`, add the page imports after the `RegisterPage` import (line 8):
```tsx
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
```

Add the two routes inside `<Routes>`, after the `/register` route (line 91):
```tsx
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
```

- [ ] **Step 3: Build the frontend**

Run: `npm run build:frontend`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/pages/LoginPage.tsx apps/frontend/src/App.tsx
git commit -m "feat(frontend): link forgot-password from login and register routes"
```

---

## Task 12: Final full verification

**Files:** none (verification only)

- [ ] **Step 1: Build everything**

Run from repo root:
```bash
npm run build:backend
npm run build:frontend
```
Expected: both succeed.

- [ ] **Step 2: Run backend tests**

Run: `npm run test --workspace=apps/backend`
Expected: PASS — all specs green, including `auth.service.spec`.

- [ ] **Step 3: Lint**

Run:
```bash
npm run lint --workspace=apps/backend
npm run lint --workspace=apps/frontend
```
Expected: no errors (frontend is `max-warnings 0`).

- [ ] **Step 4 (manual, USER runs dev servers): smoke test**

Provide the user these steps (do not start servers yourself):
1. Start backend + frontend dev servers.
2. Go to `/login` → click "Forgot password?".
3. Enter a registered email → submit → confirmation message shown.
4. Check the backend console for the Ethereal "preview URL" → open it → see the reset email → click the link.
5. On `/reset-password`, set a new password → redirected to `/login`.
6. Log in with the new password → success.
7. Re-open the old reset link → "invalid or expired" message.

---

## Self-Review (completed by plan author)

- **Spec coverage:** data model (Task 2), MailModule + Ethereal fallback (Task 4), `/auth/forgot-password` + `/auth/reset-password` (Tasks 5–6), enumeration-safe generic response (Tasks 5–6 + tested), hashed/single-use/1h-expiry token (Tasks 2, 5 + tested), frontend link + 2 routes + 2 thunks (Tasks 8–11), env vars (Task 7), testing (Task 5). Rate-limiting intentionally out of scope per spec.
- **Placeholders:** none — every code/test step shows full content.
- **Type consistency:** `findByResetTokenHash` (Task 3) ↔ used in Task 5; `requestPasswordReset`/`resetPassword` thunk names consistent across Tasks 8–11; `resetPasswordTokenHash`/`resetPasswordExpires` field names consistent across Tasks 2, 3, 5.
