import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);

    if (user && await bcrypt.compare(password, user.password)) {
      // Convert Mongoose document to plain object if needed
      const userObj = (user as any).toObject ? (user as any).toObject() : user;
      const { password, ...result } = userObj;
      return result;
    }
    
    return null;
  }

  async login(user: any) {
    const userId = user._id?.toString() || user.id?.toString();
    
    if (!userId) {
      throw new Error('Invalid user object - no ID found');
    }
    
    const payload = { username: user.username, sub: userId };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: userId,
        username: user.username,
        email: user.email,
        level: user.level || 0,
        experience: user.experience || 0,
        rating: user.rating || 1000,
        wins: user.wins || 0,
        losses: user.losses || 0,
      },
    };
  }

  async register(username: string, email: string, password: string) {
    // Check for existing username
    const existingUser = await this.usersService.findByUsername(username);
    if (existingUser) {
      throw new UnauthorizedException('Username already exists');
    }

    // Check for existing email
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new UnauthorizedException('Email already exists');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await this.usersService.create({
        username,
        email,
        password: hashedPassword,
      });

      return this.login(user);
    } catch (error: any) {
      // Handle MongoDB duplicate key errors as fallback
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        if (field === 'email') {
          throw new UnauthorizedException('Email already exists');
        } else if (field === 'username') {
          throw new UnauthorizedException('Username already exists');
        } else {
          throw new UnauthorizedException('Account with this information already exists');
        }
      }
      
      // Re-throw other errors
      throw error;
    }
  }
}
