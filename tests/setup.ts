import { beforeAll, afterAll, afterEach } from 'vitest';

// 테스트 환경 설정
beforeAll(() => {
  // 환경 변수 설정
  process.env.FOOD_API_KEY = 'test-api-key';
});

afterEach(() => {
  // 각 테스트 후 정리
});

afterAll(() => {
  // 모든 테스트 후 정리
});
