import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import crypto from 'crypto';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  private s3: S3Client;

  constructor(private configService: ConfigService) {
    this.s3 = new S3Client({
      region: this.configService.get('S3_REGION', 'us-east-1'),
      endpoint: this.configService.get('S3_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get('S3_ACCESS_KEY')!,
        secretAccessKey: this.configService.get('S3_SECRET_KEY')!,
      },
      forcePathStyle: true,
    });
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png', 
      'application/pdf',
      'image/heic',
      'image/heif'
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }

    // Compute SHA256 checksum for deduplication
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const key = `receipts/${hash}-${Date.now()}`;
    
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.configService.get('S3_BUCKET'),
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );
      
      return { 
        key,
        url: `${this.configService.get('S3_ENDPOINT')}/${this.configService.get('S3_BUCKET')}/${key}`,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        hash
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new BadRequestException('Failed to upload file');
    }
  }
}
