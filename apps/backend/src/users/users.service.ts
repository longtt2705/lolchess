import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: any): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-password').exec();
  }

  async findOne(id: string): Promise<User> {
    return this.userModel.findById(id).select('-password').exec();
  }

  async findByUsername(username: string): Promise<User> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }

  // Login accepts either a username or an email. Username takes precedence so a
  // username login stays deterministic even in the unlikely event a username
  // collides with another account's email.
  async findByUsernameOrEmail(identifier: string): Promise<UserDocument | null> {
    const byUsername = await this.userModel.findOne({ username: identifier }).exec();
    if (byUsername) {
      return byUsername;
    }
    return this.userModel.findOne({ email: identifier }).exec();
  }

  async findByResetTokenHash(tokenHash: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ resetPasswordTokenHash: tokenHash }).exec();
  }

  async update(id: string, updateUserDto: any): Promise<User> {
    return this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password')
      .exec();
  }

  async remove(id: string): Promise<User> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async updateRating(id: string, newRating: number): Promise<User> {
    return this.userModel
      .findByIdAndUpdate(id, { rating: newRating }, { new: true })
      .select('-password')
      .exec();
  }

  async incrementWins(id: string): Promise<User> {
    return this.userModel
      .findByIdAndUpdate(id, { $inc: { wins: 1 } }, { new: true })
      .select('-password')
      .exec();
  }

  async incrementLosses(id: string): Promise<User> {
    return this.userModel
      .findByIdAndUpdate(id, { $inc: { losses: 1 } }, { new: true })
      .select('-password')
      .exec();
  }
}
