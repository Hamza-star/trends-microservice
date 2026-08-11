import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from 'node_modules/@nestjs/swagger/dist/swagger-module';
import { DocumentBuilder } from 'node_modules/@nestjs/swagger/dist/document-builder';

export async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.use(cookieParser());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    app.enableCors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    });

    app.set('trust proxy', true);

    // ============= SWAGGER SETUP =============
  const config = new DocumentBuilder()
    .setTitle('Area Management API')
    .setDescription('NestJS CRUD API for hierarchical area management')
    .setVersion('1.0')
    .addTag('Areas', 'Area management endpoints')
    .addBearerAuth() // If you have JWT authentication
    .build();
  
    // Add swaggerModule to the app 
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      displayRequestDuration: true,
    },
  });
  
    await app.listen(process.env.PORT ?? 5000);
    return app;
  } catch (error) {
    console.error('Failed to start application:', error);
    console.log(`Swagger UI available at: http://localhost:3000/docs`);
    process.exit(1);
  }
}

if (require.main === module) {
  void bootstrap();
}
