import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { FriendsService } from './friends.service.js';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('add')
  async addFriend(@CurrentUser() user: { id: string }) {
    try {
      console.log('Adding friend for user:', user.id);
      const result = await this.friendsService.addFriend(user.id);
      console.log('Friend added successfully:', result);
      return result;
    } catch (error) {
      console.error('Error adding friend:', error);
      throw error;
    }
  }

  @Post('accept')
  async acceptFriend(
    @CurrentUser() user: { id: string },
    @Body() body: { token: string }
  ) {
    return this.friendsService.acceptFriend(user.id, body.token);
  }

  @Get()
  async getFriends(@CurrentUser() user: { id: string }) {
    return this.friendsService.getFriends(user.id);
  }
}
