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
}