/**
 * 식당 위생 정보 도메인 타입
 */

import type { TrustScoreResult } from '../trust-score.types.js';

/**
 * 위생 등급 코드
 */
export type HygieneGradeCode = 'AAA' | 'AA' | 'A';

/**
 * 위생 등급 라벨
 */
export type HygieneGradeLabel = '매우 우수' | '우수' | '좋음';

/**
 * 식당 기본 정보
 */
export interface Restaurant {
  /** 식당명 */
  name: string;
  /** 주소 */
  address: string;
  /** 업종 (일반음식점, 휴게음식점 등) */
  business_type: string;
  /** 인허가번호 (선택) */
  license_no?: string;
  /** 전화번호 (선택) */
  phone?: string;
  /** 카테고리 (카카오맵 카테고리, 선택) */
  category?: string;
}

/**
 * 위생 등급 정보
 */
export interface HygieneGrade {
  /** 등급 보유 여부 */
  has_grade: boolean;
  /** 등급 코드 (AAA, AA, A) */
  grade: HygieneGradeCode | null;
  /** 등급 라벨 (매우 우수, 우수, 좋음) */
  grade_label: HygieneGradeLabel | null;
  /** 등급 지정일 (YYYY-MM-DD) */
  grade_date: string | null;
  /** 등급 유효기간 종료일 (YYYY-MM-DD) */
  valid_until: string | null;
  /** 별점 (3, 2, 1, 0) */
  stars: 3 | 2 | 1 | 0;
}

/**
 * 행정처분 개별 항목
 */
export interface ViolationItem {
  /** 처분확정일 (YYYY-MM-DD) */
  date: string;
  /** 처분유형 (영업정지, 과태료 등) */
  type: string;
  /** 처분내용 */
  content: string;
  /** 위반사유 */
  reason: string;
  /** 처분기간 (영업정지의 경우) */
  period?: {
    start: string;
    end: string;
  };
}

/**
 * 행정처분 이력 정보
 */
export interface ViolationHistory {
  /** 전체 처분 건수 */
  total_count: number;
  /** 최근 처분 목록 (최대 3건) */
  recent_items: ViolationItem[];
  /** 추가 이력 존재 여부 */
  has_more: boolean;
}

/**
 * 식당 위생 정보 조회 결과 (MCP Tool 출력)
 */
export interface RestaurantHygieneResult {
  restaurant: Restaurant;
  hygiene_grade: HygieneGrade;
  violations: ViolationHistory;
  /** 신뢰도 점수 (선택적 - 계산에 필요한 정보가 있을 때만) */
  trust_score?: TrustScoreResult;
}

/**
 * MCP Tool 입력 파라미터
 */
export interface GetRestaurantHygieneInput {
  /** 식당 상호명 */
  restaurant_name: string;
  /** 지역명 (시/구/동) */
  region: string;
  /** 행정처분 이력 포함 여부 (기본값: true) */
  include_history?: boolean;
}

/**
 * 검색 결과 후보 (중복 시 사용)
 */
export interface RestaurantCandidate {
  /** 식당명 */
  name: string;
  /** 주소 */
  address: string;
  /** 인허가번호 */
  license_no: string;
}

/**
 * 에러 코드
 */
export type HygieneErrorCode =
  | 'NOT_FOUND'
  | 'MULTIPLE_RESULTS'
  | 'API_ERROR'
  | 'INVALID_INPUT';

/**
 * 에러 응답 타입
 */
export type HygieneError =
  | {
      code: 'NOT_FOUND';
      message: string;
    }
  | {
      code: 'MULTIPLE_RESULTS';
      message: string;
      candidates: RestaurantCandidate[];
    }
  | {
      code: 'API_ERROR';
      message: string;
    }
  | {
      code: 'INVALID_INPUT';
      message: string;
      missing_field: 'restaurant_name' | 'region';
    };

/**
 * 조회 결과 (성공 또는 에러)
 */
export type GetRestaurantHygieneResult =
  | { success: true; data: RestaurantHygieneResult }
  | { success: false; error: HygieneError };
