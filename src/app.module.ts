import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import authConfig from './auth/auth.config';
import trendsConfig from './config/trends.config';
import { TrendsModule } from './trends/trends.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [authConfig, trendsConfig],
      validate: (config) => {
        const requiredVariables = [
          'MONGO_URI',
          'MONGO_DB_NAME',
          'TRENDS_COLLECTIONS',
          'TRENDS_PROJECT_COLLECTIONS',
          'SERVICE_TOKENS',
        ];
        const missingVariables = requiredVariables.filter(
          (variable) => !config[variable]?.trim(),
        );
        const collections = config.TRENDS_COLLECTIONS
          ?.split(',')
          .map((collection: string) => collection.trim())
          .filter(Boolean);
        const serviceCredentials = config.SERVICE_TOKENS
          ?.split(',')
          .map((credential: string) => {
            const separatorIndex = credential.indexOf(':');
            return {
              project: separatorIndex >= 0 ? credential.slice(0, separatorIndex).trim() : '',
              token: separatorIndex >= 0 ? credential.slice(separatorIndex + 1).trim() : '',
            };
          })
          .filter(({ project, token }: { project: string; token: string }) => project && token);
        const projectCollections = config.TRENDS_PROJECT_COLLECTIONS
          ?.split(',')
          .map((entry: string) => {
            const separatorIndex = entry.indexOf(':');
            const project = separatorIndex >= 0 ? entry.slice(0, separatorIndex).trim() : '';
            const collections = separatorIndex >= 0
              ? entry.slice(separatorIndex + 1).split('|').map((collection: string) => collection.trim()).filter(Boolean)
              : [];
            return { project, collections };
          })
          .filter(({ project, collections }: { project: string; collections: string[] }) => project && collections.length);
        const configuredProjects = new Set(
          projectCollections?.map(({ project }: { project: string }) => project),
        );
        const serviceProjects = serviceCredentials?.map(({ project }: { project: string }) => project) ?? [];
        const allowedCollections = new Set(collections ?? []);
        const projectConfigurationIsValid =
          !!projectCollections?.length &&
          serviceProjects.every((project) => configuredProjects.has(project)) &&
          projectCollections.every(({ collections: projectCollectionsList }: { collections: string[] }) =>
            projectCollectionsList.every((collection) => allowedCollections.has(collection)),
          );

        if (
          missingVariables.length ||
          !collections?.length ||
          !serviceCredentials?.length ||
          !projectConfigurationIsValid
        ) {
          const message = missingVariables.length
            ? `Missing required environment variables: ${missingVariables.join(', ')}`
            : !collections?.length
              ? 'TRENDS_COLLECTIONS must contain at least one non-empty collection name'
              : !serviceCredentials?.length
                ? 'SERVICE_TOKENS must contain at least one project:token pair'
                : 'TRENDS_PROJECT_COLLECTIONS must configure every service project';
          throw new Error(message);
        }

        return config;
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('trends.mongoUri'),
        dbName: configService.getOrThrow<string>('trends.databaseName'),
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
