# 기여 가이드

Clean Plate MCP에 기여해 주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 시작하기

### 개발 환경 설정

1. **저장소 포크 및 클론**

```bash
git clone https://github.com/your-username/clean-plate-mcp.git
cd clean-plate-mcp
```

2. **의존성 설치**

```bash
npm install
```

3. **환경변수 설정**

```bash
cp .env.example .env
# .env 파일을 편집하여 API 키 입력
```

4. **개발 서버 실행**

```bash
# MCP stdio 모드
npm run dev

# REST API 서버
npm run dev:server
```

### 테스트 실행

```bash
# 테스트 실행
npm run test:run

# 테스트 감시 모드
npm test

# 커버리지 리포트
npm run test:coverage
```

### 코드 품질 검사

```bash
# 린트
npm run lint

# 타입 체크
npm run typecheck

# 빌드
npm run build
```

## 코드 스타일

이 프로젝트는 다음 도구를 사용합니다:

- **ESLint**: 코드 린팅
- **Prettier**: 코드 포맷팅
- **TypeScript**: 정적 타입 검사

### 주요 규칙

- 모든 코드는 TypeScript로 작성
- 함수와 클래스에 JSDoc 주석 작성
- 테스트 파일은 `*.test.ts` 형식
- 커밋 전 `npm run lint && npm run typecheck` 실행

## 이슈 보고

### 버그 리포트

버그를 발견하셨나요? 다음 정보를 포함해 이슈를 생성해 주세요:

1. 버그 설명
2. 재현 단계
3. 예상 동작
4. 실제 동작
5. 환경 정보 (Node.js 버전, OS 등)

### 기능 요청

새로운 기능을 제안하고 싶으시다면:

1. 기능 설명
2. 사용 사례
3. 구현 아이디어 (선택)

## Pull Request

### PR 제출 과정

1. **브랜치 생성**

```bash
git checkout -b feature/your-feature-name
# 또는
git checkout -b fix/your-bug-fix
```

2. **변경 사항 커밋**

```bash
git add .
git commit -m "feat: 기능 설명"
```

커밋 메시지 형식:
- `feat:` 새로운 기능
- `fix:` 버그 수정
- `docs:` 문서 변경
- `refactor:` 리팩토링
- `test:` 테스트 추가/수정
- `chore:` 기타 변경

3. **푸시 및 PR 생성**

```bash
git push origin feature/your-feature-name
```

GitHub에서 Pull Request를 생성합니다.

### PR 체크리스트

- [ ] 모든 테스트 통과 (`npm run test:run`)
- [ ] 린트 검사 통과 (`npm run lint`)
- [ ] 타입 체크 통과 (`npm run typecheck`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 필요시 테스트 추가
- [ ] 필요시 문서 업데이트

## 프로젝트 구조

```
src/
├── index.ts              # MCP stdio 진입점
├── main.ts               # NestJS 서버 진입점
├── core/                 # 비즈니스 로직
│   └── restaurant-hygiene.core.ts
├── services/             # API 서비스
│   ├── hygiene-grade.service.ts
│   ├── violation.service.ts
│   └── kakao-map.service.ts
├── modules/              # NestJS 모듈
│   ├── hygiene/          # REST API
│   └── mcp/              # MCP HTTP
├── utils/                # 유틸리티
├── types/                # 타입 정의
├── formatters/           # 출력 포맷터
└── config/               # 설정
```

## 질문이 있으신가요?

- GitHub Issues에 질문을 남겨주세요
- 기존 이슈와 문서를 먼저 확인해 주세요

감사합니다!
