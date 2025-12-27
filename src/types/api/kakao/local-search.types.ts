/**
 * Kakao Local Search API 타입 정의
 *
 * 카카오 로컬 키워드 검색 API 응답 타입
 * @see https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
 */

/**
 * 카카오맵 장소 검색 결과
 */
export interface KakaoPlace {
  /** 장소 ID */
  id: string;
  /** 장소명 */
  place_name: string;
  /** 카테고리 이름 */
  category_name: string;
  /** 카테고리 그룹 코드 */
  category_group_code: string;
  /** 카테고리 그룹명 */
  category_group_name: string;
  /** 전화번호 */
  phone: string;
  /** 지번 주소 */
  address_name: string;
  /** 도로명 주소 */
  road_address_name: string;
  /** X 좌표 (경도) */
  x: string;
  /** Y 좌표 (위도) */
  y: string;
  /** 장소 상세 페이지 URL */
  place_url: string;
  /** 중심좌표까지의 거리 (단위: m) */
  distance?: string;
}

/**
 * 카카오맵 API 응답 메타 정보
 */
export interface KakaoMeta {
  /** 검색어에 검색된 문서 수 */
  total_count: number;
  /** 현재 페이지가 마지막 페이지인지 여부 */
  is_end: boolean;
  /** total_count 중 노출 가능 문서 수 */
  pageable_count: number;
  /** 동일 지역 결과 */
  same_name?: {
    region: string[];
    keyword: string;
    selected_region: string;
  };
}

/**
 * 카카오맵 키워드 검색 API 응답
 */
export interface KakaoSearchResponse {
  meta: KakaoMeta;
  documents: KakaoPlace[];
}

/**
 * 카카오맵 검색 파라미터
 */
export interface KakaoSearchParams {
  /** 검색 키워드 */
  query: string;
  /** 카테고리 그룹 코드 (FD6: 음식점, CE7: 카페) */
  category_group_code?: 'FD6' | 'CE7';
  /** X 좌표 (경도) - 중심 좌표 */
  x?: string;
  /** Y 좌표 (위도) - 중심 좌표 */
  y?: string;
  /** 중심 좌표로부터의 반경 (단위: m, 0~20000) */
  radius?: number;
  /** 결과 페이지 번호 (1~45) */
  page?: number;
  /** 한 페이지에 보여질 문서 수 (1~15) */
  size?: number;
  /** 결과 정렬 순서 (distance: 거리순, accuracy: 정확도순) */
  sort?: 'distance' | 'accuracy';
}
