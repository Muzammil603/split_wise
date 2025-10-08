import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FxService } from './fx.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('fx')
export class FxController {
  constructor(private fxService: FxService) {}

  @Get('rate')
  async getRate(
    @Query('base') baseCcy: string,
    @Query('quote') quoteCcy: string,
    @Query('date') date?: string
  ) {
    const targetDate = date ? new Date(date) : undefined;
    const rate = await this.fxService.getRate(baseCcy, quoteCcy, targetDate);
    
    if (!rate) {
      return { error: `No rate found for ${baseCcy}/${quoteCcy}` };
    }
    
    return { baseCcy, quoteCcy, rate, date: targetDate || new Date() };
  }

  @Post('rate')
  async addRate(
    @Body() body: {
      baseCcy: string;
      quoteCcy: string;
      rate: number;
      date?: string;
    }
  ) {
    const targetDate = body.date ? new Date(body.date) : undefined;
    await this.fxService.addRate(body.baseCcy, body.quoteCcy, body.rate, targetDate);
    return { success: true };
  }

  @Get('convert')
  async convert(
    @Query('amount') amount: string,
    @Query('from') fromCcy: string,
    @Query('to') toCcy: string,
    @Query('date') date?: string
  ) {
    const amountCents = Math.round(parseFloat(amount) * 100);
    const targetDate = date ? new Date(date) : undefined;
    const convertedCents = await this.fxService.convertAmount(amountCents, fromCcy, toCcy, targetDate);
    
    return {
      originalAmount: amountCents,
      convertedAmount: convertedCents,
      fromCcy,
      toCcy,
      date: targetDate || new Date()
    };
  }
}
