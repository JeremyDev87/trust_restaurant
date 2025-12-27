/**
 * 공공데이터포털 HACCP 인증업체 API 타입
 * @see https://www.data.go.kr/data/15033311/openapi.do
 */

export interface HaccpApiResponse {
  header: {
    resultCode: string;
    resultMessage: string;
  };
  body: {
    numOfRows: string;
    pageNo: string;
    totalCount: string;
    items?: {
      item: HaccpCompanyItem | HaccpCompanyItem[];
    };
  };
}

export interface HaccpCompanyItem {
  /** 인증번호 */
  appointno: string;
  /** 식품/축산 구분 */
  productGb: string;
  /** 업체명 */
  company: string;
  /** 사업자번호 */
  companyNo: string;
  /** 대표자명 */
  ceoname: string;
  /** 주소 */
  worksaddr: string;
  /** 시도 */
  area1: string;
  /** 시군구 */
  area2: string;
  /** 업태명 */
  companykindNm: string;
  /** 업종명 */
  businesstypeNm: string;
  /** 인증일 */
  issuedate: string;
  /** 인증만료일 */
  issueenddate: string;
}

export interface HaccpSearchParams {
  /** 업체명 검색 */
  company?: string;
  /** 페이지 번호 */
  pageNo?: number;
  /** 페이지당 결과 수 */
  numOfRows?: number;
}
