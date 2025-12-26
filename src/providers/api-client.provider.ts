/**
 * API 클라이언트 프로바이더
 *
 * FoodSafetyApiClient를 NestJS DI 컨테이너에 등록
 */

import { Provider } from '@nestjs/common';
import { FoodSafetyApiClient } from '../utils/api-client.js';

export const API_CLIENT_TOKEN = 'FOOD_SAFETY_API_CLIENT';

export const ApiClientProvider: Provider = {
  provide: API_CLIENT_TOKEN,
  useFactory: () => {
    return new FoodSafetyApiClient(process.env.FOOD_API_KEY);
  },
};
