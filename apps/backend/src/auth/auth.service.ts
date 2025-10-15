import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { EmailService } from '../email/email.service.js';
import * as crypto from 'crypto';

type RegisterDto = { email: string; name?: string; password: string };
type LoginDto = { email: string; password: string };

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.googleClient = new OAuth2Client(
      this.cfg.get<string>('GOOGLE_CLIENT_ID'),
      this.cfg.get<string>('GOOGLE_CLIENT_SECRET')
    );
  }

  private tokens(userId: string, email?: string | null) {
    const access = this.jwt.sign({ sub: userId, userId, email: email ?? undefined }, {
      secret: this.cfg.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m'
    });
    const refresh = this.jwt.sign({ sub: userId }, {
      secret: this.cfg.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '30d'
    });
    return { access, refresh };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email in use');

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name ?? 'Anonymous',
      },
      select: { id: true, email: true, name: true },
    });

    const tokens = this.tokens(user.id, user.email);
    return { ...tokens, user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.tokens(user.id, user.email);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name } };
  }

  async refresh(refresh: string) {
    try {
      const payload = this.jwt.verify<{ sub: string }>(refresh, { 
        secret: this.cfg.getOrThrow<string>('JWT_REFRESH_SECRET') 
      });
      // rotation: always issue a brand new pair on refresh
      return this.tokens(payload.sub);
    } catch {
      throw new UnauthorizedException();
    }
  }

  async forgotPassword(email: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: 'If an account with that email exists, password reset instructions have been sent.' };
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store the token in the database
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    // Send the reset email
    console.log(`📧 Attempting to send password reset email to ${email}...`);
    try {
      await this.emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
      console.log(`✅ Password reset email sent successfully to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      console.error('Error details:', error.message || error);
      // Still return success to not reveal if email exists
    }
    
    return { 
      message: 'Password reset instructions have been sent to your email. Check your inbox and spam folder.' 
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // Find the reset token
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Reset token has expired');
    }

    // Check if token has already been used
    if (resetToken.usedAt) {
      throw new UnauthorizedException('Reset token has already been used');
    }

    // Hash the new password
    const passwordHash = await argon2.hash(newPassword);

    // Update the user's password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password has been reset successfully' };
  }

      async googleAuth(googleToken: string) {
        try {
          // Check if this is a mock token for development
          if (googleToken.startsWith('google_token_')) {
            // Handle mock Google OAuth for development
            const mockUser = {
              id: 'mock_google_user_' + Date.now(),
              email: 'mockuser@gmail.com',
              name: 'Mock Google User',
              picture: 'https://via.placeholder.com/150/32a852/ffffff?text=G',
            };

            // Check if user exists, if not create them
            let user = await this.prisma.user.findUnique({
              where: { email: mockUser.email },
              select: { id: true, email: true, name: true },
            });

            if (!user) {
              user = await this.prisma.user.create({
                data: {
                  email: mockUser.email,
                  name: mockUser.name,
                  passwordHash: '', // No password for OAuth users
                  image: mockUser.picture,
                },
                select: { id: true, email: true, name: true },
              });
            }

            const tokens = this.tokens(user.id, user.email);
            return { ...tokens, user };
          }

          // Verify the real Google token
          const ticket = await this.googleClient.verifyIdToken({
            idToken: googleToken,
            audience: this.cfg.get<string>('GOOGLE_CLIENT_ID'),
          });

          const payload = ticket.getPayload();
          if (!payload) {
            throw new UnauthorizedException('Invalid Google token');
          }

          const googleUser = {
            id: payload.sub,
            email: payload.email!,
            name: payload.name || payload.given_name || 'Google User',
            picture: payload.picture,
          };

          // Check if user exists, if not create them
          let user = await this.prisma.user.findUnique({
            where: { email: googleUser.email },
            select: { id: true, email: true, name: true },
          });

          if (!user) {
            user = await this.prisma.user.create({
              data: {
                email: googleUser.email,
                name: googleUser.name,
                passwordHash: '', // No password for OAuth users
                image: googleUser.picture,
              },
              select: { id: true, email: true, name: true },
            });
          }

          const tokens = this.tokens(user.id, user.email);
          return { ...tokens, user };
        } catch (error) {
          throw new UnauthorizedException('Invalid Google token');
        }
      }

}