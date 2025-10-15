import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async addFriend(userId: string) {
    // Generate a simple token
    const token = 'friend_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Store the friend request in the database
    await this.prisma.friend.create({
      data: {
        userId,
        friendId: userId, // Temporarily set to same user, will be updated when accepted
        token,
        status: 'pending',
      }
    });
    
    return {
      token,
      message: 'Share this token with your friend to add them',
      instructions: 'Your friend should use the "Accept Friend" feature and enter this token'
    };
  }

  async acceptFriend(userId: string, token: string) {
    // Find the friend request by token
    const friendRequest = await this.prisma.friend.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!friendRequest) {
      throw new NotFoundException('Invalid friend token');
    }

    if (friendRequest.status !== 'pending') {
      throw new ConflictException('Friend request already processed');
    }

    if (friendRequest.userId === userId) {
      throw new ConflictException('Cannot add yourself as a friend');
    }

    // Update the friend request to accepted
    await this.prisma.friend.update({
      where: { id: friendRequest.id },
      data: {
        friendId: userId,
        status: 'accepted',
        acceptedAt: new Date(),
      }
    });

    // Create a reciprocal friend record
    await this.prisma.friend.create({
      data: {
        userId,
        friendId: friendRequest.userId,
        token: 'reciprocal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        status: 'accepted',
        acceptedAt: new Date(),
      }
    });

    return {
      message: 'Friend request accepted! You are now friends.',
      success: true
    };
  }

  async getFriends(userId: string) {
    const friends = await this.prisma.friend.findMany({
      where: {
        OR: [
          { userId: userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        },
        friend: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    });

    // Transform the data to show friends (not the relationship records)
    const friendList = friends.map(f => {
      if (f.userId === userId) {
        return {
          id: f.friend.id,
          name: f.friend.name,
          email: f.friend.email,
          image: f.friend.image,
          friendshipId: f.id,
          createdAt: f.createdAt,
        };
      } else {
        return {
          id: f.user.id,
          name: f.user.name,
          email: f.user.email,
          image: f.user.image,
          friendshipId: f.id,
          createdAt: f.createdAt,
        };
      }
    });

    // Remove duplicates based on friend ID
    const uniqueFriends = friendList.filter((friend, index, self) => 
      index === self.findIndex(f => f.id === friend.id)
    );

    return { friends: uniqueFriends };
  }
}
