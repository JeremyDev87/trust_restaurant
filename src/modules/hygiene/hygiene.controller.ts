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
import { z } from 'zod';
import { HygieneService } from './hygiene.service.js';

/**
 * 요청 스키마
 */
const RequestSchema = z.object({
  restaurant_name: z.string().min(1, '식당명을 입력해주세요'),
  region: z.string().min(1, '지역명을 입력해주세요'),
  include_history: z.boolean().optional().default(true),
});

@Controller('api/restaurant-hygiene')
export class HygieneController {
  constructor(private readonly hygieneService: HygieneService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async queryHygiene(@Body() body: unknown) {
    // 요청 검증
    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors
        .map((e) => e.message)
        .join(', ');

      throw new HttpException(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: errorMessage },
        },
        HttpStatus.BAD_REQUEST
      );
    }

    // 서비스 호출
    const result = await this.hygieneService.query(parseResult.data);

    if (!result.success && result.statusCode) {
      throw new HttpException(
        { success: false, error: result.error },
        result.statusCode
      );
    }

    return result;
  }
}
