import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  process.on('uncaughtException', async (err) => {
    console.error('Uncaught Exception:', err);
    await app.close();
    process.exit(1);
  });

  // Manually handle unhandled promise rejections
  process.on('unhandledRejection', async (reason) => {
    console.error('Unhandled Rejection reason:', reason);
    await app.close();
    process.exit(1);
  });
  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port);
}
void bootstrap();
