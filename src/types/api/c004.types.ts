/**
 * C004 - 식품접객업소 위생등급 지정현황 API 타입
 *
 * @see https://www.foodsafetykorea.go.kr/api/openApiInfo.do?menu_grp=MENU_GRP31&menu_no=661&show_cnt=10&start_idx=1&svc_no=C004
 */

/**
 * C004 API 응답 전체 구조
 */
export interface C004Response {
  C004: {
    /** 총 데이터 건수 */
    total_count: string;
    /** 결과 데이터 배열 */
    row?: C004Row[];
    /** API 결과 정보 */
    RESULT: C004Result;
  };
}

/**
 * C004 API 결과 코드
 */
export interface C004Result {
  /** 결과 메시지 */
  MSG: string;
  /** 결과 코드 (INFO-000: 정상) */
  CODE: string;
}

/**
 * C004 API 개별 데이터 행
 */
export interface C004Row {
  /** 업소명 */
  BSSH_NM: string;
  /** 주소 */
  ADDR: string;
  /** 지정등급 (매우우수 / 우수 / 좋음) */
  HG_ASGN_LV: string;
  /** 지정기관 */
  HG_ASGN_NM: string;
  /** 지정시작일자 (YYYYMMDD) */
  ASGN_FROM: string;
  /** 지정종료일자 (YYYYMMDD) */
  ASGN_TO: string;
  /** 지정일자 (YYYYMMDD) */
  HG_ASGN_YMD: string;
  /** 지정번호 */
  HG_ASGN_NO: string;
  /** 업종명 */
  INDUTY_NM: string;
  /** 인허가번호 */
  LCNS_NO: string;
  /** 전화번호 */
  TELNO: string;
  /** 사업자등록번호 */
  WRKR_REG_NO: string;
  /** 대표자명 (마스킹됨) */
  PRSDNT_NM: string;
  /** 관할기관명 */
  INSTT_CD_NM: string;
  /** 폐업일자 */
  CLSBIZ_DT: string;
  /** 폐업구분코드명 (정상 / 폐업) */
  CLSBIZ_DVS_CD_NM: string;
  /** 지정취소일자 */
  ASGN_CANCEL_YMD: string;
  /** 변경일자 (YYYYMMDD) */
  CHNG_DT: string;
}

/**
 * 위생등급 타입 (API 응답 값)
 */
export type HygieneGradeLevel = '매우우수' | '우수' | '좋음';

/**
 * C004 API 에러 코드
 */
export const C004_ERROR_CODES = {
  SUCCESS: 'INFO-000',
  NO_DATA: 'INFO-200',
  AUTH_ERROR: 'ERROR-300',
  PARAM_ERROR: 'ERROR-310',
  SERVICE_ERROR: 'ERROR-500',
} as const;
