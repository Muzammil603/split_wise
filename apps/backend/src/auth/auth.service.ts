import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

type RegisterDto = { email: string; name?: string; password: string };
type LoginDto = { email: string; password: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

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

    const accessToken = await this.signAccessToken(user.id, user.email);
    return { accessToken, user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.signAccessToken(user.id, user.email);
    return { accessToken, user: { id: user.id, email: user.email, name: user.name } };
  }

  // Access token only for now. Refresh/rotation can be added later.
  private async signAccessToken(userId: string, email?: string | null) {
    const payload = { sub: userId, email: email ?? undefined };
    const secret = this.cfg.getOrThrow<string>('JWT_ACCESS_SECRET');
    const expiresIn = this.cfg.get<string>('JWT_EXPIRES_IN') ?? '15m';
    return this.jwt.signAsync(payload, { secret, expiresIn });
  }
}