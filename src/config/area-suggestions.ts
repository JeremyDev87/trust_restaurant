/**
 * 지역별 세분화 제안 설정
 *
 * 지역 검색 결과가 너무 많을 때 사용자에게 제안할 세부 지역 목록
 */

/**
 * 서울시 구별 세분화 제안
 */
export const AREA_SUGGESTIONS: Record<string, string[]> = {
  강남구: [
    '역삼역',
    '강남역',
    '삼성역',
    '선릉역',
    '청담동',
    '논현동',
    '신사동',
  ],
  서초구: ['강남역', '서초역', '교대역', '양재역', '방배동', '반포동'],
  마포구: ['홍대입구역', '합정역', '망원동', '연남동', '상수역'],
  송파구: ['잠실역', '석촌역', '송파역', '문정동', '방이동'],
  영등포구: ['여의도역', '영등포역', '당산역', '문래동'],
  종로구: ['광화문역', '종각역', '안국역', '삼청동', '북촌'],
  중구: ['명동역', '을지로역', '충무로역', '동대문역'],
  용산구: ['이태원역', '녹사평역', '한남동', '용산역'],
  성동구: ['성수역', '왕십리역', '서울숲역', '뚝섬역'],
  광진구: ['건대입구역', '구의역', '아차산역'],
  구로구: ['신도림역', '구로디지털단지역', '대림역'],
} as const;

/**
 * 기본 세분화 제안 생성
 *
 * AREA_SUGGESTIONS에 없는 지역의 경우 사용
 */
export function getDefaultSuggestions(area: string): string[] {
  return [`${area} 역 근처`, `${area} 중심가`, `${area} 동쪽`, `${area} 서쪽`];
}

/**
 * 지역에 대한 세분화 제안 조회
 */
export function getAreaSuggestions(area: string): string[] {
  // 입력된 지역에서 구 이름 추출
  for (const [gu, suggestions] of Object.entries(AREA_SUGGESTIONS)) {
    if (area.includes(gu)) {
      return [...suggestions];
    }
  }

  // 기본 제안
  return getDefaultSuggestions(area);
}
