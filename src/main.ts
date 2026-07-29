import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.enableCors({
      origin: true,
      credentials: true,
    });
    await app.listen(process.env.PORT ?? 3000);
    return app;
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  void bootstrap();
}
