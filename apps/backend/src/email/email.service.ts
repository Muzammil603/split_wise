import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpSecure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true' || smtpPort === 465;
    
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    // Verify SMTP connection at startup
    this.transporter.verify()
      .then(() => console.log('✅ SMTP connected & ready'))
      .catch(err => console.error('❌ SMTP verify failed:', err));
  }

  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:8081')}/reset-password?token=${resetToken}`;
    
    // For development: Log the email instead of sending it
    console.log('📧 ===== PASSWORD RESET EMAIL =====');
    console.log(`To: ${email}`);
    console.log(`From: ${this.configService.get<string>('SMTP_FROM', 'noreply@splitwise-plus.com')}`);
    console.log(`Subject: Reset Your Password - Splitwise+`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Token: ${resetToken}`);
    console.log('=====================================');
    
    // In production, you would use the real SMTP configuration
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    if (smtpPass && smtpPass !== 'your_sendgrid_api_key') {
      const mailOptions = {
        from: this.configService.get<string>('SMTP_FROM', 'noreply@splitwise-plus.com'),
        to: email,
        subject: 'Reset Your Password - Splitwise+',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #32a852;">Reset Your Password</h2>
            <p>Hello ${name},</p>
            <p>You requested to reset your password for your Splitwise+ account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #32a852; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">This email was sent from Splitwise+</p>
          </div>
        `,
      };

      try {
        await this.transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to ${email}`);
      } catch (error) {
        console.error('❌ Failed to send password reset email:', error);
        throw new Error('Failed to send password reset email');
      }
    } else {
      console.log('⚠️  Using mock email service (no real SMTP configured)');
    }
  }

  async sendGroupInviteEmail(email: string, groupName: string, inviterName: string, inviteToken: string): Promise<void> {
    const acceptUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:8081')}/accept-invite?token=${inviteToken}`;
    
    // For development: Log the email instead of sending it
    console.log('📧 ===== GROUP INVITE EMAIL =====');
    console.log(`To: ${email}`);
    console.log(`From: ${this.configService.get<string>('SMTP_FROM', 'noreply@splitwise-plus.com')}`);
    console.log(`Subject: You're invited to join "${groupName}" on Splitwise+`);
    console.log(`Accept URL: ${acceptUrl}`);
    console.log(`Token: ${inviteToken}`);
    console.log(`Group: ${groupName}`);
    console.log(`Inviter: ${inviterName}`);
    console.log('=====================================');
    
    // In production, you would use the real SMTP configuration
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    if (smtpPass && smtpPass !== 'your_sendgrid_api_key') {
      const mailOptions = {
        from: this.configService.get<string>('SMTP_FROM', 'noreply@splitwise-plus.com'),
        to: email,
        subject: `You're invited to join "${groupName}" on Splitwise+`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #32a852;">You've Been Invited!</h2>
            <p>Hello,</p>
            <p><strong>${inviterName}</strong> has invited you to join the group <strong>"${groupName}"</strong> on Splitwise+.</p>
            <p>Click the button below to accept the invitation:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" style="background-color: #32a852; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${acceptUrl}</p>
            <p>Once you accept, you'll be able to track and split expenses with the group members.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 14px;">This email was sent from Splitwise+</p>
          </div>
        `,
      };

      try {
        await this.transporter.sendMail(mailOptions);
        console.log(`✅ Group invite email sent to ${email} for group ${groupName}`);
      } catch (error) {
        console.error('❌ Failed to send group invite email:', error);
        // Don't throw error, just log it
      }
    } else {
      console.log('⚠️  Using mock email service (no real SMTP configured)');
    }
  }
}
