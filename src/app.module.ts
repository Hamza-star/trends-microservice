import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import trendsConfig from './config/trends.config';
import { TrendsModule } from './trends/trends.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [trendsConfig],
      validate: (config) => {
        const requiredVariables = ['MONGO_URI'];
        const missingVariables = requiredVariables.filter(
          (variable) => !config[variable]?.trim(),
        );

        if (missingVariables.length) {
          throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
        }

        return config;
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('trends.mongoUri'),
        autoIndex: configService.get<string>('NODE_ENV') !== 'production',
        
        // Maximum wait time to connect to database (10 seconds)
        // If DB doesn't connect in 10 seconds → timeout error
        connectTimeoutMS: 10000,
        
        // Maximum time for a single query to run (45 seconds)
        // If query runs longer than 45 seconds → cancel it
        socketTimeoutMS: 45000,
        retryAttempts: 5,
        retryDelay: 3000,
        connectionFactory: (connection) => {
          connection.set('strictPopulate', false);
          return connection;
        },
      }),
    }),
    
    TrendsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
