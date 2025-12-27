/**
 * Naver Place 도메인 타입 정의
 *
 * 네이버 플레이스 서비스에서 사용하는 도메인 모델
 */

// API 타입 re-export (하위 호환성 유지)
export {
  NaverLocalSearchItem,
  NaverLocalSearchResponse,
  NaverApiErrorResponse,
} from './api/naver/index.js';

/**
 * 가격대 분류
 */
export type PriceRange = 'low' | 'medium' | 'high' | null;

/**
 * 네이버 플레이스 정보
 */
export interface NaverPlaceInfo {
  /** 장소 ID */
  id: string;
  /** 장소명 */
  name: string;
  /** 주소 */
  address: string;
  /** 카테고리 */
  category: string;
  /** 평점 (0-5, null이면 평점 없음) */
  score: number | null;
  /** 리뷰 수 */
  reviewCount: number;
  /** 가격대 */
  priceRange: PriceRange;
  /** 영업시간 */
  businessHours: string | null;
  /** 대표 이미지 URL */
  imageUrl: string | null;
}
