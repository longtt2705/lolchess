import { Controller, Request, Post, Get, UseGuards, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() registerDto: { username: string; email: string; password: string }) {
    return this.authService.register(registerDto.username, registerDto.email, registerDto.password);
  }

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

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const userId = req.user.userId;

    if (!userId) {
      throw new Error('No user ID found in token');
    }

    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: (user as any)._id?.toString() || (user as any).id?.toString(),
      username: user.username,
      email: user.email,
      level: user.level || 0,
      experience: user.experience || 0,
      rating: user.rating || 1000,
      wins: user.wins || 0,
      losses: user.losses || 0,
    };
  }
}
