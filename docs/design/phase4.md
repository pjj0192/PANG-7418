# Phase 4 설계 - Wire ↔ Bubble 충돌, 분할, 스테이지 클리어

`PLAN.md`의 Phase 4(Wire ↔ Bubble 충돌, 분할, 스테이지 클리어)를 어떻게 구현할지에 대한 설계 문서. 기준 문서는 `docs/FEATURES/game_rule.md`(Wire/Bubble 상호작용, 승리 조건).

## 목표 (재확인)

Wire가 Bubble에 맞으면 크기 단계에 따라 분할되거나 소멸하고, 모든 Bubble이 사라지면 스테이지 클리어가 되는 핵심 승리 루프를 완성한다.

## 범위

**포함**
- Wire ↔ Bubble 충돌 판정
- 명중 시: 큰→중간 2개, 중간→작은 2개로 분할 / 작은 Bubble은 분할 없이 소멸
- 명중한 Wire는 그 자리에서 소멸(관통하지 않음)
- 화면 내 모든 Bubble이 사라지면 스테이지 클리어(클리어 화면/메시지 표시)

**제외 (다음 Phase 이후)**
- Player ↔ Bubble 충돌, 목숨/무적/게임오버 (Phase 5)
- 아이템 드롭 (Phase 6)
- 클리어 화면에서 메인으로 복귀하는 동선 (Phase 7) — 이 Phase에서는 클리어 메시지 표시까지만

## 충돌 판정

Bubble은 원(중심 `(x, y)`, 반지름 `BUBBLE_RADIUS[size]`), Wire는 얇은 직사각형(`Wire.tsx` 렌더링과 동일하게 `left = x - WIRE_WIDTH/2, top = y, width = WIRE_WIDTH, height = WIRE_HEIGHT`)이다. 원-사각형 교차 판정(가장 가까운 점 방식)을 사용한다.

```ts
// src/game/collision.ts
function circleIntersectsRect(
  cx: number, cy: number, r: number,
  rectLeft: number, rectTop: number, rectWidth: number, rectHeight: number,
): boolean {
  const closestX = Math.max(rectLeft, Math.min(cx, rectLeft + rectWidth))
  const closestY = Math.max(rectTop, Math.min(cy, rectTop + rectHeight))
  const dx = cx - closestX
  const dy = cy - closestY
  return dx * dx + dy * dy <= r * r
}
```

## 분할 로직

크기 단계 전이: `large → medium`, `medium → small`, `small → 소멸(분할 없음)`.

```ts
// src/game/collision.ts
const NEXT_SIZE: Record<BubbleSize, BubbleSize | null> = {
  large: 'medium',
  medium: 'small',
  small: null,
}

function splitBubble(bubble: Bubble, newIds: [number, number]): Bubble[] {
  const nextSize = NEXT_SIZE[bubble.size]
  if (nextSize === null) return [] // 가장 작은 크기 → 소멸

  return [
    { id: newIds[0], x: bubble.x, y: bubble.y, vx: -SPLIT_SPEED_X, vy: -SPLIT_KICK_VY, size: nextSize },
    { id: newIds[1], x: bubble.x, y: bubble.y, vx: SPLIT_SPEED_X, vy: -SPLIT_KICK_VY, size: nextSize },
  ]
}
```

- 분할된 두 Bubble은 같은 위치에서 좌/우로 반대 방향 수평 속도(`SPLIT_SPEED_X`)와 위쪽으로 튀어 오르는 속도(`SPLIT_KICK_VY`, 음수)를 받아 자연스럽게 갈라져 나간다. 이후는 기존 `stepBubble` 물리(중력, 경계 반사)를 그대로 따른다.
- `constants.ts`에 `SPLIT_SPEED_X`, `SPLIT_KICK_VY` 상수를 추가한다.

## 매 프레임 처리 순서 (Mission1Screen)

지금까지는 `wires`와 `bubbles`를 각각 독립적인 `setState` 함수형 업데이트로 갱신했지만, 충돌 판정은 두 배열을 동시에 참조해야 한다(Wire가 Bubble을 지웠는지, Bubble이 두 개로 늘었는지가 서로 맞물림). 이를 위해 Player의 `playerXRef`와 같은 패턴으로 `wiresRef`, `bubblesRef`를 두어 매 렌더링마다 최신 state를 미러링하고, 게임 루프 tick 안에서는 이 ref 값을 읽어 **한 번에** 다음 상태를 계산한다.

```ts
const wiresRef = useRef(wires)
wiresRef.current = wires
const bubblesRef = useRef(bubbles)
bubblesRef.current = bubbles
const nextBubbleId = useRef(2) // INITIAL_BUBBLES가 0, 1을 이미 사용

useGameLoop((deltaMs) => {
  // ...player 이동은 기존과 동일...

  const movedWires = wiresRef.current
    .map((wire) => ({ ...wire, y: wire.y - WIRE_SPEED * deltaMs }))
    .filter((wire) => wire.y > 0)
  const movedBubbles = bubblesRef.current.map((bubble) => stepBubble(bubble, deltaMs))

  const { wires: nextWires, bubbles: nextBubbles } = resolveWireBubbleCollisions(
    movedWires,
    movedBubbles,
    () => nextBubbleId.current++,
  )

  setWires(nextWires)
  setBubbles(nextBubbles)

  if (nextBubbles.length === 0) {
    setIsCleared(true)
  }
})
```

`resolveWireBubbleCollisions`는 `collision.ts`에 두는 순수 함수로, 다음을 수행한다:

1. 각 Wire에 대해 아직 이번 tick에 다른 Wire가 먼저 맞히지 않은 Bubble 중 첫 번째로 충돌하는 Bubble을 찾는다.
2. 충돌이 있으면 해당 Wire를 결과에서 제외하고, 해당 Bubble을 `splitBubble` 결과(0개 또는 2개)로 치환한다.
3. 한 Bubble이 같은 tick에 두 번 맞지 않도록(향후 동시 발사 아이템 대비) 이미 소비된 Bubble id는 Set으로 추적한다.

**Wire를 배열로, Bubble 크기를 타입으로 미리 설계해둔 이유가 여기서 드러난다**: Phase 2에서 Wire를 배열로 설계해둔 덕분에, 이후 연사 아이템이 추가돼 Wire가 여러 개 동시에 존재해도 `resolveWireBubbleCollisions`의 "여러 Wire를 순회하며 각각 첫 충돌 Bubble을 찾는" 구조를 그대로 재사용할 수 있다.

## 스테이지 클리어

- `Mission1Screen`에 `isCleared: boolean` state 추가. `bubbles`가 빈 배열이 되는 순간 `true`로 설정.
- 클리어되면 방향키/Space 입력을 더 이상 게임에 반영하지 않도록 조기 반환하거나 무시(게임 루프 자체를 막을 필요는 없음 — 어차피 조작 대상이 없으므로 자연스럽게 정지된 것처럼 보임).
- 화면에는 게임 영역 위에 반투명 오버레이 + "STAGE CLEAR" 메시지를 표시(메인 화면 복귀 버튼/동선은 Phase 7에서 추가).

```tsx
{isCleared && (
  <div className="clear-overlay">
    <p>STAGE CLEAR</p>
  </div>
)}
```

## 파일 구조

```
src/
  game/
    constants.ts        # SPLIT_SPEED_X, SPLIT_KICK_VY 추가
    collision.ts         # circleIntersectsRect, splitBubble, resolveWireBubbleCollisions
    bubblePhysics.ts     # 기존 stepBubble 그대로 재사용(변경 없음)
  screens/
    Mission1Screen.tsx   # wiresRef/bubblesRef 도입, 매 tick 충돌 판정, isCleared 상태/오버레이
    Mission1Screen.css   # .clear-overlay 스타일 추가
```

## 검수 체크리스트 (PLAN.md 고객 테스트 포인트 매핑)

- [ ] 큰 Bubble을 맞히면 중간 크기 2개로 갈라지는지
- [ ] 중간 Bubble을 맞히면 작은 크기 2개로 갈라지는지
- [ ] 작은 Bubble을 맞히면 분할 없이 그냥 사라지는지
- [ ] 분할된 두 Bubble이 서로 반대 방향으로 자연스럽게 튀어나가는지(같은 자리에 겹쳐있지 않는지)
- [ ] Wire가 Bubble을 맞히는 순간 Wire도 함께 사라지는지(관통하지 않는지)
- [ ] 화면의 모든 Bubble을 없앴을 때 클리어 메시지가 뜨는지

## 열린 질문 (검토 시 확인 필요)

1. 분할된 Bubble이 튀어나가는 속도(`SPLIT_SPEED_X`, `SPLIT_KICK_VY`)는 Phase 2/3과 마찬가지로 임의값으로 구현 후 플레이하며 조정해도 되는지
2. 클리어 화면의 문구/스타일(간단한 "STAGE CLEAR" 텍스트 오버레이 정도로 충분한지, 별도 디자인 요구사항이 있는지)
3. 클리어 후 방향키/Space 입력을 완전히 잠글지, 아니면 그냥 대상이 없어 자연스럽게 무의미해지는 정도로 둘지
