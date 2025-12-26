/**
 * I2630 - 행정처분결과(식품접객업) API 타입
 *
 * @see https://www.foodsafetykorea.go.kr/api/openApiInfo.do?menu_grp=MENU_GRP31&menu_no=661&show_cnt=10&start_idx=1&svc_no=I2630
 */

/**
 * I2630 API 응답 전체 구조
 */
export interface I2630Response {
  I2630: {
    /** 총 데이터 건수 */
    total_count: string;
    /** 결과 데이터 배열 */
    row?: I2630Row[];
    /** API 결과 정보 */
    RESULT: I2630Result;
  };
}

/**
 * I2630 API 결과 코드
 */
export interface I2630Result {
  /** 결과 메시지 */
  MSG: string;
  /** 결과 코드 (INFO-000: 정상) */
  CODE: string;
}

/**
 * I2630 API 개별 데이터 행
 */
export interface I2630Row {
  /** 업소명 */
  PRCSCITYPOINT_BSSHNM: string;
  /** 주소 */
  ADDR: string;
  /** 업종 */
  INDUTY_CD_NM: string;
  /** 인허가번호 */
  LCNS_NO: string;
  /** 처분확정일자 (YYYYMMDD) */
  DSPS_DCSNDT: string;
  /** 처분시작일 (YYYYMMDD) - 영업정지의 경우 */
  DSPS_BGNDT: string;
  /** 처분종료일 (YYYYMMDD) - 영업정지의 경우 */
  DSPS_ENDDT: string;
  /** 처분유형 (영업정지, 과태료, 시정명령 등) */
  DSPS_TYPECD_NM: string;
  /** 위반일자 및 위반내용 */
  VILTCN: string;
  /** 전화번호 */
  TEL_NO: string;
  /** 대표자명 (마스킹됨) */
  PRSDNT_NM: string;
  /** 처분내용 */
  DSPSCN: string;
  /** 위반법령 */
  LAWORD_CD_NM: string;
  /** 공개기한 */
  PUBLIC_DT: string;
  /** 최종수정일 */
  LAST_UPDT_DTM: string;
  /** 처분기관명 */
  DSPS_INSTTCD_NM: string;
  /** 행정처분전산키 */
  DSPSDTLS_SEQ: string;
}

/**
 * 처분유형 타입
 */
export type ViolationType =
  | '영업정지'
  | '영업허가취소'
  | '영업소폐쇄'
  | '과태료'
  | '시정명령'
  | '품목제조정지'
  | string; // 기타 유형 허용

/**
 * I2630 API 에러 코드
 */
export const I2630_ERROR_CODES = {
  SUCCESS: 'INFO-000',
  NO_DATA: 'INFO-200',
  AUTH_ERROR: 'ERROR-300',
  PARAM_ERROR: 'ERROR-310',
  SERVICE_ERROR: 'ERROR-500',
} as const;
