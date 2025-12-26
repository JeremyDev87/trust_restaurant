/**
 * Hygiene 컨트롤러
 *
 * REST API 엔드포인트: POST /api/restaurant-hygiene
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { HygieneService } from './hygiene.service.js';
import { HygieneRequestSchema, validateRequest } from '../../utils/index.js';

@Controller('api/restaurant-hygiene')
export class HygieneController {
  constructor(private readonly hygieneService: HygieneService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async queryHygiene(@Body() body: unknown) {
    // 요청 검증 (정규화 + 보안 검사 포함)
    const validationResult = validateRequest(HygieneRequestSchema, body);

    if (!validationResult.success) {
      throw new HttpException(
        {
          success: false,
          error: validationResult.error,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 서비스 호출
    const result = await this.hygieneService.query(validationResult.data);

    if (!result.success && result.statusCode) {
      throw new HttpException(
        { success: false, error: result.error },
        result.statusCode,
      );
    }

    return result;
  }
}
