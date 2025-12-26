/**
 * MCP 모듈
 *
 * MCP Streamable HTTP Transport를 제공하는 NestJS 모듈
 */

import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller.js';

@Module({
  controllers: [McpController],
})
export class McpModule {}
