# Changelog

이 프로젝트의 모든 주요 변경 사항을 기록합니다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 기반으로 하며,
이 프로젝트는 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

## [1.0.0] - 2024-12-26

### Added

- 식당 위생등급 조회 기능 (식약처 C004 API)
- 행정처분 이력 조회 기능 (식약처 I2630 API)
- 카카오맵 API 연동으로 정확한 식당 검색
- MCP stdio 서버 지원
- MCP HTTP (Streamable) 서버 지원
- REST API 엔드포인트 (`/api/restaurant-hygiene`)
- NestJS 기반 서버 아키텍처
- Vercel 서버리스 배포 지원
- 145개 단위/통합 테스트

### Features

- **위생등급 조회**: AAA/AA/A 등급 및 유효기간 확인
- **행정처분 이력**: 최근 3년간 행정처분 내역 조회
- **복수 결과 처리**: 여러 식당 검색 시 후보 목록 제공
- **위생등급 미등록 처리**: 카카오맵 정보와 함께 "미등록" 표시

### Technical

- TypeScript 5.6+
- NestJS 11
- MCP SDK 1.0
- Vitest 테스트 프레임워크

---

## [Unreleased]

### Planned

- npm 패키지 발행
- 더 많은 필터 옵션 (업종, 지역 범위 등)
- 캐싱 레이어 추가
- 다국어 지원

---

## 버전 관리 정책

- **Major (X.0.0)**: 호환되지 않는 API 변경
- **Minor (0.X.0)**: 하위 호환 기능 추가
- **Patch (0.0.X)**: 하위 호환 버그 수정
