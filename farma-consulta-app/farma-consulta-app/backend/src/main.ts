import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const frontendUrl = config.get<string>('FRONTEND_URL')?.trim().replace(/\/$/, '');
  const allowedOrigins: string[] = [frontendUrl, 'http://localhost:5173'].filter(
    (origin): origin is string => Boolean(origin),
  );

  console.log('CORS liberado para:', allowedOrigins);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;

  await app.listen(port, '0.0.0.0');

  console.log(`Farma Consulta API rodando na porta ${port}`);
}
bootstrap();
