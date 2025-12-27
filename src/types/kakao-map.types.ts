/**
 * Kakao Map 도메인 타입 정의
 *
 * 카카오맵 서비스에서 사용하는 도메인 모델
 */

// API 타입 re-export (하위 호환성 유지)
export {
  KakaoPlace,
  KakaoMeta,
  KakaoSearchResponse,
  KakaoSearchParams,
} from './api/kakao/index.js';

/**
 * 평점 정보
 */
export interface RatingInfo {
  /** 평점 (0-5), 데이터가 없으면 null */
  score: number | null;
  /** 리뷰 수 */
  reviewCount: number;
}

/**
 * 간소화된 식당 정보 (내부 사용)
 */
export interface RestaurantInfo {
  /** 장소 ID */
  id: string;
  /** 식당명 */
  name: string;
  /** 지번 주소 */
  address: string;
  /** 도로명 주소 */
  roadAddress: string;
  /** 전화번호 */
  phone: string;
  /** 카테고리 */
  category: string;
  /** 경도 */
  longitude: string;
  /** 위도 */
  latitude: string;
  /** 평점 정보 (카카오 API는 제공하지 않음, 다른 소스에서 채움) */
  rating?: RatingInfo;
  /** 영업시간 (카카오 API는 제공하지 않음, 다른 소스에서 채움) */
  businessHours?: string | null;
  /** 장소 상세 페이지 URL */
  placeUrl?: string;
}
