/**
 * 주소 매칭 유틸리티
 *
 * 사용자가 입력한 지역명과 API 응답의 주소를 매칭합니다.
 */

/**
 * 주소에서 지역 정보 추출
 */
export interface ParsedAddress {
  /** 시/도 (서울특별시, 경기도 등) */
  sido?: string;
  /** 시/군/구 (강남구, 성남시 등) */
  sigungu?: string;
  /** 읍/면/동 (역삼동, 분당동 등) */
  eupmyeondong?: string;
  /** 전체 주소 */
  full: string;
}

/**
 * 시/도 약칭 매핑
 */
const SIDO_ALIASES: Record<string, string[]> = {
  서울: ['서울특별시', '서울시'],
  부산: ['부산광역시', '부산시'],
  대구: ['대구광역시', '대구시'],
  인천: ['인천광역시', '인천시'],
  광주: ['광주광역시', '광주시'],
  대전: ['대전광역시', '대전시'],
  울산: ['울산광역시', '울산시'],
  세종: ['세종특별자치시', '세종시'],
  경기: ['경기도'],
  강원: ['강원도', '강원특별자치도'],
  충북: ['충청북도'],
  충남: ['충청남도'],
  전북: ['전라북도', '전북특별자치도'],
  전남: ['전라남도'],
  경북: ['경상북도'],
  경남: ['경상남도'],
  제주: ['제주특별자치도', '제주도'],
};

/**
 * 주소 문자열을 파싱하여 지역 정보 추출
 */
export function parseAddress(address: string): ParsedAddress {
  const result: ParsedAddress = { full: address };

  // 시/도 추출 (첫 번째 공백 또는 특별시/광역시/도 까지)
  const sidoMatch = address.match(
    /^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|강원특별자치도|충청북도|충청남도|전라북도|전북특별자치도|전라남도|경상북도|경상남도|제주특별자치도|제주도)/,
  );

  if (sidoMatch) {
    result.sido = sidoMatch[1];

    // 시/군/구 추출
    const remainingAfterSido = address.slice(sidoMatch[1].length).trim();
    const sigunguMatch = remainingAfterSido.match(/^([가-힣]+[시군구])/);

    if (sigunguMatch) {
      result.sigungu = sigunguMatch[1];

      // 읍/면/동 추출
      const remainingAfterSigungu = remainingAfterSido
        .slice(sigunguMatch[1].length)
        .trim();
      const eupmyeondongMatch =
        remainingAfterSigungu.match(/^([가-힣0-9]+[읍면동가로])/);

      if (eupmyeondongMatch) {
        result.eupmyeondong = eupmyeondongMatch[1];
      }
    }
  }

  return result;
}

/**
 * 지역명 정규화 (약칭 → 정식 명칭)
 */
export function normalizeRegion(region: string): string[] {
  const normalized: string[] = [region];

  // 시/도 약칭 확장
  for (const [alias, fullNames] of Object.entries(SIDO_ALIASES)) {
    if (region.includes(alias)) {
      fullNames.forEach(fullName => {
        normalized.push(region.replace(alias, fullName));
      });
    }
  }

  // "구" 가 없으면 "구" 추가 시도
  if (
    !region.endsWith('구') &&
    !region.endsWith('시') &&
    !region.endsWith('동')
  ) {
    normalized.push(`${region}구`);
    normalized.push(`${region}동`);
  }

  return [...new Set(normalized)];
}

/**
 * 주소가 지역과 매칭되는지 확인
 *
 * @param address - API 응답의 전체 주소
 * @param region - 사용자가 입력한 지역명
 * @returns 매칭 여부
 */
export function matchAddress(address: string, region: string): boolean {
  if (!address || !region) {
    return false;
  }

  const normalizedAddress = address.toLowerCase().replace(/\s+/g, '');
  const regions = normalizeRegion(region);

  return regions.some(r => {
    const normalizedRegion = r.toLowerCase().replace(/\s+/g, '');
    return normalizedAddress.includes(normalizedRegion);
  });
}

/**
 * 업소명이 검색어와 매칭되는지 확인
 *
 * @param name - API 응답의 업소명
 * @param searchName - 사용자가 입력한 검색어
 * @returns 매칭 여부
 */
export function matchName(name: string, searchName: string): boolean {
  if (!name || !searchName) {
    return false;
  }

  const normalizedName = name.toLowerCase().replace(/\s+/g, '');
  const normalizedSearch = searchName.toLowerCase().replace(/\s+/g, '');

  // 정확히 포함되는지 확인
  return normalizedName.includes(normalizedSearch);
}

/**
 * 주소와 업소명 모두 매칭되는지 확인
 */
export function matchRestaurant(
  restaurantName: string,
  restaurantAddress: string,
  searchName: string,
  searchRegion: string,
): boolean {
  return (
    matchName(restaurantName, searchName) &&
    matchAddress(restaurantAddress, searchRegion)
  );
}
