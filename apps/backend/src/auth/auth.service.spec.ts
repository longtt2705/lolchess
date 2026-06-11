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
      findByUsernameOrEmail: jest.fn(),
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
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('validateUser (login by username OR email)', () => {
    it('authenticates a correct password when the identifier is the email, not the username', async () => {
      const password = 'secret123';
      const hash = await bcrypt.hash(password, 10);
      usersService.findByUsernameOrEmail.mockResolvedValue({
        _id: 'u1',
        username: 'ysvjppro',
        email: 'a@b.com',
        password: hash,
      });

      const result = await authService.validateUser('a@b.com', password);

      expect(usersService.findByUsernameOrEmail).toHaveBeenCalledWith('a@b.com');
      expect(result).toBeTruthy();
      expect(result.username).toBe('ysvjppro');
      expect(result.password).toBeUndefined();
    });

    it('returns null when the password does not match', async () => {
      const hash = await bcrypt.hash('secret123', 10);
      usersService.findByUsernameOrEmail.mockResolvedValue({
        _id: 'u1',
        username: 'ysvjppro',
        email: 'a@b.com',
        password: hash,
      });

      const result = await authService.validateUser('a@b.com', 'wrong-password');

      expect(result).toBeNull();
    });
  });

  describe('forgotPassword', () => {
    it('stores a hashed token (not the raw token) with a ~1h expiry and emails a link', async () => {
      usersService.findByEmail.mockResolvedValue({ _id: 'u1', email: 'a@b.com' });

      await authService.forgotPassword('a@b.com');

      expect(usersService.update).toHaveBeenCalledTimes(1);
      const [userId, patch] = usersService.update.mock.calls[0];
      expect(userId).toBe('u1');
      expect(patch.resetPasswordTokenHash).toMatch(/^[a-f0-9]{64}$/);
      const ttlMs = patch.resetPasswordExpires.getTime() - Date.now();
      expect(ttlMs).toBeGreaterThan(55 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(60 * 60 * 1000);

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

    it('does not throw when sending the email fails (enumeration-safety)', async () => {
      usersService.findByEmail.mockResolvedValue({ _id: 'u1', email: 'a@b.com' });
      mailService.sendPasswordResetEmail.mockRejectedValue(new Error('smtp down'));

      await expect(authService.forgotPassword('a@b.com')).resolves.toBeUndefined();
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

    it('rejects a new password shorter than 6 characters before any lookup', async () => {
      await expect(authService.resetPassword('rawtoken', '123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(usersService.findByResetTokenHash).not.toHaveBeenCalled();
      expect(usersService.update).not.toHaveBeenCalled();
    });
  });
});
