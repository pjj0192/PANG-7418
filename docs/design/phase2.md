# Phase 2 설계 - Player 이동 & Wire 발사

`PLAN.md`의 Phase 2(Player 이동 & Wire 발사)를 어떻게 구현할지에 대한 설계 문서. 기준 문서는 `docs/FEATURES/game_rule.md`(Player/Wire 규칙).

## 목표 (재확인)

Player가 좌/우로 이동하고 Space로 Wire를 수직 발사하는 조작 루프를 구현한다. 아직 Bubble이 없으므로 Wire는 화면 상단/벽에 닿으면 소멸하는 것까지만 확인한다.

## 범위

**포함**
- 방향키 좌/우로 Player 이동, 게임 영역 좌우 경계를 벗어나지 않음
- Space로 Player 위치에서 Wire를 수직 위로 발사
- Wire는 동시에 1개만 존재(발사 중 재발사 불가) — 단, 최대 동시 개수는 상수로 분리해 이후 아이템 효과로 늘어날 수 있게 설계(아래 "상태 설계" 참고)
- Wire가 게임 영역 상단에 닿으면 소멸

**제외 (다음 Phase 이후)**
- Bubble 오브젝트/물리 (Phase 3)
- Wire-Bubble 충돌/분할 (Phase 4)
- 목숨/무적/게임오버 (Phase 5)
- 아이템 (Phase 6)

**참고**: `game_rule.md`에는 "Wire가 벽(좌우 경계)에 닿으면 소멸"도 명시돼 있으나, Wire는 Player의 x 좌표에서 수직으로만 이동하고 좌우로 움직이지 않으므로 실질적으로 좌우 벽에 닿는 경우는 발생하지 않는다. 이 규칙은 상단 벽 충돌로만 실현되며, 이후 Phase에서 Block/파워업 등으로 Wire 이동 방식이 바뀌지 않는 한 별도 처리는 불필요하다.

## 게임 영역 정의

- Mission1Screen 내부에 고정 크기의 게임 영역(예: 480 × 640px)을 두고, 그 안에서만 Player/Wire가 움직인다. 이 영역이 "화면 좌우 경계/상단"의 기준이 된다.
- 렌더링은 별도 캔버스 라이브러리 없이 **DOM 기반**(절대 위치 `div`)으로 진행한다. 오브젝트 수가 적고(Player 1, Wire 1) 이 규모에서 canvas 도입은 과함. Bubble이 늘어나는 Phase 3~4에서도 우선 DOM 방식을 유지하고, 성능 이슈가 실제로 발생하면 그때 canvas 전환을 검토한다.
- 좌표계: 게임 영역의 좌상단을 (0, 0)으로 하는 px 단위. Player는 게임 영역 하단에 고정된 y값에서 x만 이동.

## 게임 루프

- `requestAnimationFrame` 기반의 루프에서 매 프레임 delta time(ms)을 계산해 Player 이동량/Wire 이동량에 곱한다(프레임레이트에 관계없이 일정한 속도 보장).
- 커스텀 훅 `useGameLoop(callback)`을 만들어 등록/해제를 캡슐화하고, Mission1Screen과 이후 Phase(Bubble 물리 등)에서 재사용한다.

```ts
// src/game/useGameLoop.ts
function useGameLoop(onTick: (deltaMs: number) => void) {
  useEffect(() => {
    let rafId: number
    let lastTime: number | null = null

    const loop = (time: number) => {
      if (lastTime !== null) onTick(time - lastTime)
      lastTime = time
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [onTick])
}
```

## 입력 처리

- 방향키는 "누르고 있는 동안 계속 이동"해야 하므로 Phase 1의 단발성 keydown 처리와 다르게, **눌린 키 집합**을 추적한다.
- `keydown`에서 집합에 추가, `keyup`에서 제거. 게임 루프 tick마다 이 집합을 읽어 이동량을 계산(React state가 아닌 `useRef<Set<string>>`로 관리해 매 프레임 리렌더를 유발하지 않음).
- Space는 "누르고 있어도 1회만 발사"되어야 하므로 keydown에서 `e.repeat`가 false일 때만 발사 트리거(브라우저의 키 반복 이벤트 무시).

```ts
// 개념 예시
const pressedKeys = useRef(new Set<string>())

useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') pressedKeys.current.add(e.code)
    if (e.code === 'Space' && !e.repeat) fireWire()
  }
  const onKeyUp = (e: KeyboardEvent) => pressedKeys.current.delete(e.code)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  }
}, [])
```

## 상태 설계 (Mission1Screen)

- `playerX: number` — Player의 x좌표 (state, 렌더링에 필요하므로 useState)
- `wires: { id: number; x: number; y: number }[]` — 발사된 Wire들의 배열. 배열이 비어있으면 없는 것.
- `maxWireCount: number` — 동시에 존재 가능한 Wire 개수 상한. Phase 2에서는 상수 `1`로 시작하지만, state(또는 이후 아이템 시스템이 갱신하는 값)로 분리해둔다.
  - Phase 2(연사 아이템 이전)에는 `useState(1)`로 시작해도 되고, 당장은 `constants.ts`의 상수를 그대로 참조해도 무방. 다만 "Wire가 없으면 null"처럼 개수를 구조적으로 1개로 고정하는 표현은 쓰지 않는다.
- 발사 시도 시: `wires.length < maxWireCount`이면 새 Wire를 배열에 추가, 아니면 무시. Phase 2에서는 `maxWireCount = 1`이므로 결과적으로 "동시 1개 제한"과 동일하게 동작한다.
- 게임 루프 tick에서:
  1. `pressedKeys`를 읽어 `playerX` 갱신(좌우 경계 clamp)
  2. `wires` 배열의 각 원소 y를 감소(위로 이동)시키고, 상단 경계(y ≤ 0)를 넘은 것들은 배열에서 제거(`filter`)

**향후 확장 참고**: Phase 6(아이템) 단계에서 "연사(다중 Wire 동시 발사)" 아이템이 추가되면 `maxWireCount`를 아이템 지속시간 동안 늘리는 방식으로 확장 가능하다. Wire 상태를 처음부터 배열로 설계해두는 이유가 이것이며, Phase 2 자체의 동작(동시 1개)은 바뀌지 않는다.

## 파일 구조

```
src/
  game/
    constants.ts        # GAME_WIDTH, GAME_HEIGHT, PLAYER_SPEED, WIRE_SPEED, PLAYER_SIZE, WIRE_SIZE 등
    useGameLoop.ts       # requestAnimationFrame 기반 루프 훅
    Player.tsx           # 위치(x)를 props로 받아 절대 위치 렌더링
    Wire.tsx             # 위치(x, y)를 props로 받아 절대 위치 렌더링
  screens/
    Mission1Screen.tsx   # 게임 영역, 입력 처리, 게임 루프, Player/Wire 상태 관리
    Mission1Screen.css   # 게임 영역 테두리, Player/Wire placeholder 스타일
```

- Player/Wire는 이번 Phase에서 색이 있는 사각형(또는 원) placeholder로 시각화(스프라이트/이미지는 범위 밖).

## 검수 체크리스트 (PLAN.md 고객 테스트 포인트 매핑)

- [ ] 방향키 좌/우 입력 시 Player가 부드럽게 이동하는지(키를 누르고 있는 동안 계속 이동)
- [ ] Player가 게임 영역 좌/우 경계 밖으로 나가지 않는지
- [ ] Space 입력 시 Player 위치에서 Wire가 위로 발사되는지
- [ ] Wire가 게임 영역 상단에 닿으면 사라지는지
- [ ] Wire가 화면에 남아있는 동안 Space를 다시 눌러도 두 번째 Wire가 발사되지 않는지
- [ ] 키를 연타/꾹 누르기 등 다양한 방식으로 입력해도 이상 동작(끊김, 밀림)이 없는지

## 열린 질문 (검토 시 확인 필요)

1. 게임 영역의 고정 크기(예: 480×640)와 실제 배치(화면 중앙 vs 상단 정렬)가 괜찮은지
2. Player/Wire의 placeholder 모양·색(예: Player는 사각형 바(bar), Wire는 얇은 세로 막대)이 괜찮은지, 아니면 특정 느낌을 원하는지
3. Player 이동 속도, Wire 발사 속도 등 구체적인 수치는 우선 임의값으로 구현 후 플레이해보며 조정하는 방식으로 진행해도 되는지
