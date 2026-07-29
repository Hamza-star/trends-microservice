import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly maxRetries = 5;
  private readonly retryDelayMs = 3000;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry(retryCount = 0): Promise<void> {
    const uri = this.configService.get<string>('MONGODB_URI');

    if (!uri) {
      this.logger.error('MONGODB_URI is not defined');
      throw new Error('MONGODB_URI is not defined');
    }

    try {
      await mongoose.connect(uri);
      this.logger.log('MongoDB connection successfully established');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`MongoDB connection failed: ${message}`);

      if (retryCount < this.maxRetries) {
        this.logger.warn(`Retrying MongoDB connection in ${this.retryDelayMs / 1000} seconds... (${retryCount + 1}/${this.maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        return this.connectWithRetry(retryCount + 1);
      }

      throw error;
    }
  }
}
