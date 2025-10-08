import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const notificationWorker = new Worker("notifications", async (job) => {
  const { channel, type, userId, groupId, title, body, data } = job.data;

  console.log(`Processing ${channel} notification for user ${userId}: ${title}`);

  switch (channel) {
    case 'push':
      await sendPushNotification(userId, title, body, data);
      break;
    case 'email':
      await sendEmailNotification(userId, title, body, data);
      break;
    default:
      console.warn(`Unknown notification channel: ${channel}`);
  }
}, { connection });

async function sendPushNotification(userId: string, title: string, body: string, data?: Record<string, any>) {
  // TODO: Integrate with Expo Push Notifications
  // For now, just log the notification
  console.log(`[PUSH] To: ${userId}, Title: ${title}, Body: ${body}`, data);
  
  // In a real implementation, you would:
  // 1. Get user's push token from database
  // 2. Send notification via Expo Push API
  // 3. Handle delivery failures and retries
}

async function sendEmailNotification(userId: string, title: string, body: string, data?: Record<string, any>) {
  // TODO: Integrate with email service (SendGrid, SES, etc.)
  // For now, just log the notification
  console.log(`[EMAIL] To: ${userId}, Subject: ${title}, Body: ${body}`, data);
  
  // In a real implementation, you would:
  // 1. Get user's email from database
  // 2. Send email via email service
  // 3. Handle delivery failures and retries
}
