import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto, LoginDto } from './auth.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { redact, REDACT_AUTH } from '../audit/redact.util.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuditService
  ) {}

  @Post('register') 
  async register(@Body() dto: RegisterDto) {
    const result = await this.auth.register(dto);
    
    // Log registration
    await this.audit.log({
      action: 'auth.register',
      targetType: 'user',
      targetId: result.user.id,
      meta: redact(dto, REDACT_AUTH),
    });
    
    return result;
  }

  @Post('login')    
  async login(@Body() dto: LoginDto) {
    const result = await this.auth.login(dto);
    
    // Log login
    await this.audit.log({
      action: 'auth.login',
      targetType: 'user',
      targetId: result.user.id,
      meta: redact(dto, REDACT_AUTH),
    });
    
    return result;
  }

  @Post('refresh')  
  refresh(@Body() body: { refresh: string }) { 
    return this.auth.refresh(body.refresh);
  }

  @Post('google')
  async googleAuth(@Body() body: { googleToken: string }) {
    const result = await this.auth.googleAuth(body.googleToken);
    
    // Log Google authentication
    await this.audit.log({
      action: 'auth.google',
      targetType: 'user',
      targetId: result.user.id,
      meta: { provider: 'google' },
    });
    
    return result;
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    const result = await this.auth.forgotPassword(body.email);
    
    // Log forgot password request
    await this.audit.log({
      action: 'auth.forgot_password',
      targetType: 'user',
      targetId: body.email, // Using email as identifier since we don't have user ID
      meta: { email: body.email },
    });
    
    return result;
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password: string }) {
    const result = await this.auth.resetPassword(body.token, body.password);
    
    // Log password reset
    await this.audit.log({
      action: 'auth.reset_password',
      targetType: 'user',
      targetId: body.token, // Using token as identifier
      meta: { token: body.token },
    });
    
    return result;
  }
}