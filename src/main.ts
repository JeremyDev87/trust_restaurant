/**
 * 애플리케이션 부트스트랩
 *
 * 로컬 개발용 NestJS 서버 시작점
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: '*',
    methods: 'GET,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,mcp-session-id',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Clean Plate MCP Server running on http://localhost:${port}`);
  console.log(`REST API: POST http://localhost:${port}/api/restaurant-hygiene`);
  console.log(`MCP: http://localhost:${port}/api/mcp`);
}

bootstrap();
