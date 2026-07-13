# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 기술 스택

- **React 19** + **TypeScript** (strict 모드)
- **Vite 6** — 개발 서버 및 번들러 (`@vitejs/plugin-react` 사용)
- **ESLint 9** (flat config, `eslint.config.js`) — `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` 포함
- 프로젝트는 `tsconfig.json`에서 `tsconfig.app.json`(브라우저용, `src/`)과 `tsconfig.node.json`(Node용, `vite.config.ts`)으로 분리된 project reference 구조를 사용함

루트에 `main.py`가 있지만 PyCharm이 생성한 기본 샘플 스크립트일 뿐 실제 애플리케이션과 무관함. `.venv`는 여기서 사용하지 않는 파이썬 가상환경 흔적.

## 주요 명령어

```
npm install       # 의존성 설치
npm run dev       # 개발 서버 실행 (http://localhost:5173)
npm run build     # 타입 체크(tsc -b) 후 프로덕션 빌드
npm run preview   # 빌드 결과 로컬 미리보기
npm run lint      # ESLint 검사
```

## 테스트

현재 이 저장소에는 테스트 프레임워크(Vitest, Jest 등)가 설정되어 있지 않고 테스트 파일도 없음. 코드 변경 검증은 다음으로 대체함:

```
npm run build     # tsc -b 를 통한 타입 체크
npm run lint       # ESLint 규칙 검사
```

테스트 프레임워크를 새로 추가할 경우 Vite와 통합이 쉬운 **Vitest**를 우선 고려할 것.

## 구조

- `src/main.tsx` — 진입점, `#root`에 `<App />`을 마운트
- `src/App.tsx` — 최상위 컴포넌트
- `index.html` — Vite가 서빙하는 HTML 셸, `src/main.tsx`를 모듈로 로드
- `.mcp.json` — GitHub MCP 서버 설정 (토큰 포함, git에 커밋되지 않도록 `.gitignore`에 등록됨)

## 기획 문서 (팡 게임)

게임 기획/규칙은 코드가 아닌 문서로 관리되며, 구현 전에 반드시 참고할 것:

- `docs/PRD.md` — 팡 게임 Mission 1 전체 개요(목표, 핵심 메커니즘, MVP 스코프)
- `docs/FEATURES/main.md` — 메인(타이틀) 화면 구성
- `docs/FEATURES/game_rule.md` — Player/Wire/Bubble/Block 단위의 상세 게임 룰
- `docs/FEATURES/mission1.md` — Mission 1의 난이도 구성 및 진행/종료 규칙
