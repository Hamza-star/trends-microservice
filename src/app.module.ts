import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { PrivellegesModule } from './privelleges/privelleges.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { LabelsModule } from './labels/labels.module';
import { AlarmsModule } from './alarms/alarms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ??
          'mongodb://127.0.0.1:27017/user-management-nestjs',
        connectionFactory: (connection) => {
          connection.set('strictPopulate', false);
          return connection;
        },
      }),
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PrivellegesModule,
    MenuModule,
    LabelsModule,
    AlarmsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
