# Clean Plate MCP 오픈소스 준비 계획

## 현재 상태 분석

### 프로젝트 개요
- **이름**: clean-plate-mcp
- **설명**: 식약처 공인 데이터 기반 식당 위생 정보 조회 MCP 서버
- **기술 스택**: TypeScript, NestJS, MCP SDK, Vercel Serverless
- **테스트**: 145개 테스트 통과, 커버리지 ~52%

### 현재 보유 항목

| 항목 | 상태 | 비고 |
|------|------|------|
| 소스 코드 | ✅ | 완전한 구현 |
| 테스트 | ✅ | 145개 통과 |
| .gitignore | ✅ | 완전함 |
| TypeScript 설정 | ✅ | 완전함 |
| ESLint/Prettier | ✅ | 설정됨 |
| Vercel 배포 | ✅ | 동작 중 |
| PRD 문서 | ✅ | docs/PRD.md |

### 누락된 항목

| 항목 | 우선순위 | 설명 |
|------|----------|------|
| README.md | 🔴 필수 | 프로젝트 소개, 설치, 사용법 |
| LICENSE | 🔴 필수 | MIT 라이선스 파일 |
| .env.example | 🔴 필수 | 환경변수 예시 |
| CONTRIBUTING.md | 🟡 권장 | 기여 가이드 |
| GitHub Actions | 🟡 권장 | CI/CD 파이프라인 |
| API 문서 | 🟡 권장 | REST API, MCP 사용법 |
| CHANGELOG.md | 🟢 선택 | 버전별 변경 이력 |
| Issue/PR 템플릿 | 🟢 선택 | GitHub 템플릿 |

### 보안 검토

| 항목 | 상태 | 비고 |
|------|------|------|
| API 키 하드코딩 | ✅ 안전 | 코드에 노출 없음 |
| .gitignore 설정 | ✅ 안전 | .env 파일 제외됨 |
| 민감 정보 | ✅ 안전 | 환경변수로 관리 |

---

## 작업 계획

### Phase 1: 필수 문서 (즉시)

#### 1.1 README.md
```
내용:
- 프로젝트 소개 및 기능
- 설치 방법 (npm, 로컬 개발)
- 환경변수 설정
- 사용법 (MCP, REST API)
- 예제 코드
- 라이선스
```

#### 1.2 LICENSE
```
MIT License
Copyright (c) 2024 [Author]
```

#### 1.3 .env.example
```env
# 식품안전나라 API 키 (필수)
FOOD_API_KEY=your_food_safety_api_key_here

# 카카오맵 API 키 (선택, 검색 정확도 향상)
KAKAO_API_KEY=your_kakao_api_key_here
```

### Phase 2: 기여 가이드 및 CI/CD

#### 2.1 CONTRIBUTING.md
```
내용:
- 개발 환경 설정
- 코드 스타일 가이드
- PR 제출 방법
- 이슈 보고 방법
```

#### 2.2 GitHub Actions
```yaml
워크플로우:
- CI: 빌드, 린트, 테스트
- 브랜치: main, PR
```

### Phase 3: 문서화

#### 3.1 API 문서 (docs/API.md)
```
내용:
- REST API 엔드포인트
- MCP 도구 설명
- 요청/응답 예시
- 에러 코드
```

#### 3.2 package.json 메타데이터
```json
{
  "author": "Jeremy <email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/clean-plate-mcp"
  },
  "homepage": "https://github.com/username/clean-plate-mcp#readme",
  "bugs": {
    "url": "https://github.com/username/clean-plate-mcp/issues"
  }
}
```

### Phase 4: 선택 항목

#### 4.1 CHANGELOG.md
```
내용:
- v1.0.0 초기 릴리스
- 카카오맵 연동
- NestJS 마이그레이션
```

#### 4.2 GitHub 템플릿
```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
└── PULL_REQUEST_TEMPLATE.md
```

---

## 체크리스트

### 필수 (Phase 1)
- [ ] README.md 작성
- [ ] LICENSE 파일 생성
- [ ] .env.example 작성

### 권장 (Phase 2-3)
- [ ] CONTRIBUTING.md 작성
- [ ] GitHub Actions CI 설정
- [ ] API 문서 작성
- [ ] package.json 메타데이터 보완

### 선택 (Phase 4)
- [ ] CHANGELOG.md 작성
- [ ] Issue 템플릿 생성
- [ ] PR 템플릿 생성

---

## 예상 소요 시간

| Phase | 예상 작업량 |
|-------|------------|
| Phase 1 | 30분 |
| Phase 2 | 30분 |
| Phase 3 | 30분 |
| Phase 4 | 20분 |
| **총계** | **~2시간** |

---

## 배포 전 최종 확인

1. 모든 테스트 통과 확인
2. 빌드 성공 확인
3. 민감 정보 노출 없음 확인
4. README 링크 동작 확인
5. npm 패키지 발행 준비 (선택)
