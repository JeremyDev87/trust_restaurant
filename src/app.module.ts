/**
 * 애플리케이션 루트 모듈
 *
 * Clean Plate MCP Server의 NestJS 루트 모듈
 */

import { Module } from '@nestjs/common';
import { HygieneModule } from './modules/hygiene/index.js';
import { McpModule } from './modules/mcp/index.js';

@Module({
  imports: [HygieneModule, McpModule],
})
export class AppModule {}
