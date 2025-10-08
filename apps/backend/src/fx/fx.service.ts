import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class FxService {
  constructor(private prisma: PrismaService) {}

  async getRate(baseCcy: string, quoteCcy: string, date?: Date): Promise<number | null> {
    const targetDate = date || new Date();
    
    const rate = await this.prisma.fxRate.findFirst({
      where: {
        baseCcy,
        quoteCcy,
        date: {
          lte: targetDate
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return rate ? Number(rate.rate) : null;
  }

  async addRate(baseCcy: string, quoteCcy: string, rate: number, date?: Date): Promise<void> {
    const targetDate = date || new Date();
    
    await this.prisma.fxRate.upsert({
      where: {
        date_baseCcy_quoteCcy: {
          date: targetDate,
          baseCcy,
          quoteCcy
        }
      },
      update: {
        rate
      },
      create: {
        date: targetDate,
        baseCcy,
        quoteCcy,
        rate
      }
    });
  }

  async convertAmount(amountCents: number, fromCcy: string, toCcy: string, date?: Date): Promise<number> {
    if (fromCcy === toCcy) {
      return amountCents;
    }

    const rate = await this.getRate(fromCcy, toCcy, date);
    if (!rate) {
      throw new Error(`No FX rate found for ${fromCcy}/${toCcy}`);
    }

    return Math.round(amountCents * rate);
  }
}
