# Phase 1 설계 - 메인 화면

`PLAN.md`의 Phase 1(메인 화면)을 어떻게 구현할지에 대한 설계 문서. 기준 문서는 `docs/FEATURES/main.md`.

## 목표 (재확인)

앱 실행 시 최초로 보이는 메인 화면을 만든다. 타이틀, 시작 버튼, 조작법 안내를 표시하고, 시작 조작(버튼 클릭 또는 Enter/Space) 시 Mission 1 플레이 화면으로 전환한다. 이 시점의 플레이 화면은 빈 화면(placeholder)이어도 된다.

## 범위

**포함**
- 메인 화면 UI: 타이틀 "PANG", 시작 버튼, 조작법 안내 텍스트
- 시작 버튼 클릭 → 화면 전환
- Enter 또는 Space 키 입력 → 화면 전환 (메인 화면이 보이는 동안에만 동작)
- 전환 후 보여줄 Mission 1 화면 placeholder(빈 화면 + "Mission 1" 표시 정도)

**제외 (다음 Phase 이후)**
- 실제 Player/Wire/Bubble 로직 (Phase 2~)
- 클리어/게임오버 → 메인 복귀 동선 (Phase 7)
- 메뉴 애니메이션, 배경음악, 옵션(난이도/사운드) — `main.md`에서도 범위 밖으로 명시됨

## 화면 전환 방식

라우팅 라이브러리(react-router 등)는 이 규모에 과함. `App.tsx`에서 `useState`로 화면 상태만 관리하는 가장 단순한 방식을 사용한다.

```tsx
type Screen = 'main' | 'mission1'

function App() {
  const [screen, setScreen] = useState<Screen>('main')

  if (screen === 'mission1') {
    return <Mission1Screen />
  }
  return <MainScreen onStart={() => setScreen('mission1')} />
}
```

- 상태는 `App.tsx`에만 두고, 하위 컴포넌트는 props로 콜백만 받는다(전역 상태 관리 라이브러리 도입 없음).
- 이후 Phase에서 게임 오버/클리어 → 메인 복귀가 추가되면 동일한 `setScreen`을 재사용.

## 컴포넌트/파일 구조

```
src/
  App.tsx                  # 화면 상태(screen) 관리, MainScreen/Mission1Screen 스위칭
  screens/
    MainScreen.tsx         # 타이틀 + 시작 버튼 + 조작법 안내
    Mission1Screen.tsx     # Phase 1에서는 placeholder만 표시, Phase 2부터 실제 게임 로직 추가
```

- `screens/` 디렉터리를 새로 만들어 화면 단위 컴포넌트를 분리한다. 이후 Phase에서 Player/Wire/Bubble 등 게임 오브젝트 컴포넌트는 `src/game/` 아래에 추가할 예정(Phase 2 설계에서 구체화).
- 스타일은 별도 CSS 파일 없이 우선 인라인 스타일 또는 최소한의 `App.css` 하나로 시작(디자인 시스템 도입은 범위 밖).

## MainScreen 상세 설계

**표시 요소**
1. 타이틀: `<h1>PANG</h1>` 형태로 화면 중앙 상단
2. 시작 버튼: `<button>시작하기</button>`, 클릭 시 `onStart()` 호출
3. 조작법 안내: 방향키 이동 / Space 발사 안내 문구(정적 텍스트)

**키 입력 처리**
- `MainScreen`이 마운트된 동안만 `keydown` 이벤트 리스너 등록(`useEffect`), 언마운트 시 해제
- `Enter` 또는 `Space(' ')` 입력 시 `onStart()` 호출, `event.preventDefault()`로 스페이스바의 기본 스크롤 동작 방지
- 버튼에 포커스가 가 있어도 중복 트리거되지 않도록(버튼 클릭 이벤트와 키 이벤트가 동시에 안 겹치게) 버튼은 `type="button"`으로 명시

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault()
      onStart()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [onStart])
```

## Mission1Screen(placeholder) 상세 설계

- Phase 1에서는 `<div><h2>Mission 1</h2><p>(게임 화면 준비 중)</p></div>` 정도의 최소 표시만 한다.
- Phase 2부터 이 컴포넌트 내부에 Player/Wire 등 실제 게임 캔버스(또는 DOM 기반 오브젝트)가 채워진다.

## 검수 체크리스트 (PLAN.md 고객 테스트 포인트 매핑)

- [ ] 앱 최초 실행 시 메인 화면(타이틀/버튼/조작법 안내)이 보이는가
- [ ] 시작 버튼 클릭 시 Mission 1 화면(placeholder)으로 전환되는가
- [ ] 메인 화면에서 Enter 키로도 전환되는가
- [ ] 메인 화면에서 Space 키로도 전환되는가(스크롤 등 다른 동작이 함께 일어나지 않는지)
- [ ] Mission 1 화면은 비어있어도 정상(에러/빈 화면 크래시 없음)

## 열린 질문 (검토 시 확인 필요)

1. 타이틀/버튼 디자인 톤(색상, 폰트 등)에 특별한 요구사항이 있는지, 아니면 Phase 1은 기능 위주로 최소 스타일만 적용해도 되는지
2. `screens/`, 추후 `game/` 같은 디렉터리 네이밍/구조가 이후 Phase 확장에 적합해 보이는지
