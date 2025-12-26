/**
 * 입력 검증 유틸리티
 *
 * REST API와 MCP 도구에서 공통으로 사용하는 입력 검증 로직
 */

import { z } from 'zod';

/**
 * 입력 제한 상수
 */
export const INPUT_LIMITS = {
  /** 식당명 최대 길이 */
  MAX_RESTAURANT_NAME_LENGTH: 100,
  /** 지역명 최대 길이 */
  MAX_REGION_LENGTH: 50,
  /** 주소 최대 길이 */
  MAX_ADDRESS_LENGTH: 200,
  /** 일괄 조회 최대 식당 수 */
  MAX_BULK_RESTAURANTS: 50,
  /** 일괄 조회 결과 최대 수 */
  MAX_BULK_LIMIT: 100,
} as const;

/**
 * 문자열 정규화 (공백 정리, 트림)
 */
export function normalizeString(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // 제로폭 문자 제거 (먼저 실행)
    .trim()
    .replace(/\s+/g, ' '); // 연속 공백을 단일 공백으로
}

/**
 * XSS 방지를 위한 위험 문자 검사
 */
export function containsDangerousChars(value: string): boolean {
  // HTML/JS 인젝션 위험 문자
  const dangerousPattern = /[<>'"`;\\]/;
  return dangerousPattern.test(value);
}

/**
 * 한글 포함 여부 확인
 */
export function containsKorean(value: string): boolean {
  return /[가-힣]/.test(value);
}

/**
 * 정규화 및 검증된 문자열 스키마 생성
 */
function createSanitizedStringSchema(
  fieldName: string,
  maxLength: number,
  options: { requireKorean?: boolean } = {},
) {
  return z
    .string()
    .min(1, `${fieldName}을(를) 입력해주세요`)
    .max(maxLength, `${fieldName}은(는) ${maxLength}자 이하로 입력해주세요`)
    .transform(normalizeString)
    .refine(val => val.length > 0, {
      message: `${fieldName}을(를) 입력해주세요`,
    })
    .refine(val => !containsDangerousChars(val), {
      message: `${fieldName}에 사용할 수 없는 문자가 포함되어 있습니다`,
    })
    .refine(val => !options.requireKorean || containsKorean(val), {
      message: `${fieldName}에 한글을 포함해주세요`,
    });
}

/**
 * 식당명 검증 스키마
 */
export const restaurantNameSchema = createSanitizedStringSchema(
  '식당명',
  INPUT_LIMITS.MAX_RESTAURANT_NAME_LENGTH,
);

/**
 * 지역명 검증 스키마
 */
export const regionSchema = createSanitizedStringSchema(
  '지역명',
  INPUT_LIMITS.MAX_REGION_LENGTH,
  { requireKorean: true },
);

/**
 * 지역/영역 검증 스키마 (search_area_restaurants용)
 */
export const areaSchema = createSanitizedStringSchema(
  '지역명',
  INPUT_LIMITS.MAX_REGION_LENGTH,
  { requireKorean: true },
);

/**
 * 주소 검증 스키마
 */
export const addressSchema = createSanitizedStringSchema(
  '주소',
  INPUT_LIMITS.MAX_ADDRESS_LENGTH,
);

/**
 * get_restaurant_hygiene 요청 스키마
 */
export const HygieneRequestSchema = z.object({
  restaurant_name: restaurantNameSchema,
  region: regionSchema,
  include_history: z.boolean().optional().default(true),
});

export type HygieneRequest = z.infer<typeof HygieneRequestSchema>;

/**
 * search_area_restaurants 요청 스키마
 */
export const AreaSearchRequestSchema = z.object({
  area: areaSchema,
  category: z.enum(['restaurant', 'cafe', 'all']).optional().default('all'),
});

export type AreaSearchRequest = z.infer<typeof AreaSearchRequestSchema>;

/**
 * get_bulk_hygiene_info 요청 스키마
 */
export const BulkHygieneRequestSchema = z.object({
  restaurants: z
    .array(
      z.object({
        name: restaurantNameSchema,
        address: addressSchema,
      }),
    )
    .min(1, '최소 1개의 식당을 입력해주세요')
    .max(
      INPUT_LIMITS.MAX_BULK_RESTAURANTS,
      `최대 ${INPUT_LIMITS.MAX_BULK_RESTAURANTS}개의 식당만 조회할 수 있습니다`,
    ),
  filter: z
    .enum(['all', 'clean', 'with_violations', 'no_grade'])
    .optional()
    .default('all'),
  limit: z
    .number()
    .int()
    .min(1, '최소 1개 이상 조회해야 합니다')
    .max(
      INPUT_LIMITS.MAX_BULK_LIMIT,
      `최대 ${INPUT_LIMITS.MAX_BULK_LIMIT}개까지 조회할 수 있습니다`,
    )
    .optional()
    .default(10),
});

export type BulkHygieneRequest = z.infer<typeof BulkHygieneRequestSchema>;

/**
 * 검증 결과 타입
 */
export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: {
    code: 'INVALID_REQUEST';
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export type ValidationOutcome<T> = ValidationResult<T> | ValidationError;

/**
 * 스키마 검증 헬퍼
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationOutcome<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const details = result.error.errors.map(e => ({
    field: e.path.join('.') || 'unknown',
    message: e.message,
  }));

  const message = details.map(d => d.message).join(', ');

  return {
    success: false,
    error: {
      code: 'INVALID_REQUEST',
      message,
      details,
    },
  };
}
