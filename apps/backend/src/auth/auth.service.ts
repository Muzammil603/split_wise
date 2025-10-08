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

  private tokens(userId: string, email?: string | null) {
    const access = this.jwt.sign({ sub: userId, email: email ?? undefined }, { 
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

}