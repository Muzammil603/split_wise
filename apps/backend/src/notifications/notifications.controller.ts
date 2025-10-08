import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('preferences')
  async getPreferences(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getNotificationPrefs(user.id);
  }

  @Post('preferences')
  async updatePreferences(
    @CurrentUser() user: { id: string },
    @Body() body: { email?: boolean; push?: boolean }
  ) {
    return this.notificationsService.updateNotificationPrefs(
      user.id,
      body.email,
      body.push
    );
  }

  @Post('test')
  async sendTestNotification(
    @CurrentUser() user: { id: string },
    @Body() body: { groupId: string; title?: string; body?: string }
  ) {
    await this.notificationsService.sendNotification({
      type: 'expense_added',
      userId: user.id,
      groupId: body.groupId,
      title: body.title || 'Test Notification',
      body: body.body || 'This is a test notification',
      data: { test: true }
    });

    return { success: true, message: 'Test notification sent' };
  }
}
