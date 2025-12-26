/**
 * Vercel Serverless Function - NestJS 핸들러
 *
 * NestJS 애플리케이션을 Vercel Serverless Function으로 래핑
 */

import 'reflect-metadata';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { AppModule } from '../src/app.module.js';

let cachedApp: Express | null = null;

/**
 * NestJS 앱 초기화 (싱글톤)
 */
async function getApp(): Promise<Express> {
  if (cachedApp) {
    return cachedApp;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn'],
  });

  // CORS 설정
  app.enableCors({
    origin: '*',
    methods: 'GET,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,mcp-session-id',
  });

  await app.init();

  cachedApp = expressApp;
  return expressApp;
}

/**
 * Vercel 핸들러
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const app = await getApp();
  app(req, res);
}
