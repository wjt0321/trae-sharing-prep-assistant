import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  // 全局 API 前缀：所有路由以 /api 开头
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // 全局校验管道：自动校验 DTO，拒绝多余字段
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS：允许前端开发服务器访问
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const logger = new Logger('Bootstrap');
  await app.listen(port);
  logger.log(`AI 任务管家后端服务已启动：http://localhost:${port}`);
  logger.log(`CORS 允许来源：${corsOrigin}`);
}

bootstrap();
