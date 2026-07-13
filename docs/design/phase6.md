# Phase 6 설계 - 아이템 드롭

`PLAN.md`의 Phase 6(아이템 드롭)을 어떻게 구현할지에 대한 설계 문서. 아이템 종류/효과가 확정되어, 이번 Phase에서 드롭 파이프라인과 5종 아이템의 실제 효과·중첩(스택) 규칙까지 함께 구현한다(이전 초안의 "placeholder 1종, 효과는 이후 Phase" 방침에서 범위가 확장됨).

## 목표 (재확인)

Wire에 맞은 Bubble이 소멸(분할 포함)할 때마다 20% 확률로 5종 중 하나의 아이템이 드롭되어 낙하하고, Player가 닿으면 해당 효과가 즉시 적용된다. 대부분의 효과는 중첩 가능하며 최대 3단계까지 강화된다.

## 아이템 목록

| 아이템 | 효과 | 중첩 방식 | 최대 단계 |
| --- | --- | --- | --- |
| 발수 증가 | Wire 발사 시 좌우로 갈라진 여러 발을 동시에 발사(레벨별 각도는 아래 "발수 증가" 참고) | 레벨 +1마다 발사 개수/각도 변경(고정 표) | 3레벨 |
| 발사 속도 30% 향상 | Wire가 날아가는 속도(`WIRE_SPEED`) 증가 | 레벨 +1마다 +30%p 누적(가산) | 3레벨 |
| 체력 +1 | 목숨 1 회복 | 즉시 적용, 시작 목숨(`INITIAL_LIVES`)까지만 회복 | 해당 없음(반복 섭취 가능) |
| 10초 무적 | 일정 시간 동안 Bubble에 닿아도 피격 없음, 캐릭터 머리 위에 남은 시간 바 표시 | 중첩 없음 — 먹을 때마다 잔여시간을 무조건 10초로 초기화(리필) | 상한 없음(반복 섭취 가능, 항상 최대 10초) |
| 연발 | 화면 내 동시 발사 가능한 Wire 개수(용량) 증가 | 레벨 +1마다 용량 +1 | 3레벨 |

"발수 증가"(한 번의 Space 입력으로 여러 발이 부채꼴로 나가는 것)와 "연발"(화면에 동시에 떠 있을 수 있는 Wire 총량이 늘어나는 것)은 서로 다른 축이며 동시에 적용된다 — 자세한 상호작용은 아래 "발수 × 연발 상호작용" 참고.

## 드롭 판정 및 종류 선택

Phase 4의 `resolveWireBubbleCollisions`가 충돌 위치(`hitPositions`)도 함께 반환하도록 확장하고, 20% 확률 판정과 아이템 종류 무작위 선택은 `Mission1Screen`(이미 id 카운터 등 부수효과를 다루는 곳)에서 수행한다 — 물리/충돌 판정 함수는 순수 함수로 유지해온 기존 원칙(Phase 3~5)을 따른다.

```ts
// src/game/constants.ts
export const ITEM_DROP_CHANCE = 0.2
export const ITEM_TYPES = ['spread', 'fireSpeed', 'maxWire', 'heal', 'invincible'] as const
export type ItemType = (typeof ITEM_TYPES)[number]
```

```ts
// src/screens/Mission1Screen.tsx (게임 루프 tick 안)
const { wires: nextWires, bubbles: nextBubbles, hitPositions } = resolveWireBubbleCollisions(
  movedWires, movedBubbles, () => nextBubbleId.current++,
)

const newItems = hitPositions.flatMap((pos) =>
  Math.random() < ITEM_DROP_CHANCE
    ? [{
        id: nextItemId.current++,
        x: pos.x,
        y: pos.y,
        vy: 0,
        type: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)],
      }]
    : [],
)
```

## 아이템 물리 및 픽업(공통 파이프라인)

아이템은 Bubble처럼 튕기지 않고 계속 낙하하며, **바닥에 머무르지 않는다** — Player가 서 있는 높이까지 내려올 때까지 못 받아먹으면 그대로 사라진다("놓친 아이템"). 이는 Wire가 화면 상단을 벗어나면 사라지는 것과 같은 처리 방식이다.

```ts
// src/game/constants.ts
export const ITEM_DESPAWN_Y = PLAYER_Y + PLAYER_HEIGHT // 캐릭터 발 높이 — 여기까지 내려오면 제거
```

```ts
// src/game/itemPhysics.ts
export type Item = { id: number; x: number; y: number; vy: number; type: ItemType }

export function stepItem(item: Item, deltaMs: number): Item {
  const vy = Math.min(item.vy + ITEM_GRAVITY * deltaMs, ITEM_MAX_FALL_SPEED)
  const y = item.y + vy * deltaMs
  return { ...item, y, vy }
}
```

```ts
// src/screens/Mission1Screen.tsx (게임 루프 tick 안, Wire와 동일한 패턴)
const movedItems = itemsRef.current
  .map((item) => stepItem(item, deltaMs))
  .filter((item) => item.y < ITEM_DESPAWN_Y)
```

```ts
// src/game/collision.ts
export function resolveItemPickups(
  playerRect: RectLike,
  items: Item[],
): { pickedUp: Item[]; remaining: Item[] } {
  // circleIntersectsRect(item.x, item.y, ITEM_RADIUS, ...) 재사용, Phase 5와 동일 패턴
}
```

픽업은 무적 여부와 무관하게 항상 판정한다(아이템 획득은 Bubble 피격과 별개 개념). 판정 순서는 "낙하 이동 → 픽업 판정(먹었으면 목록에서 제거) → 남은 것 중 발 높이를 지난 것은 소멸"이다.

## 업그레이드 상태 설계

지속적으로 쌓이는 강화 상태를 하나의 객체로 관리한다.

```ts
// src/game/upgrades.ts
export type Upgrades = {
  spreadLevel: number // 0~3
  fireSpeedLevel: number // 0~3
  maxWireLevel: number // 0~3
}

export const INITIAL_UPGRADES: Upgrades = { spreadLevel: 0, fireSpeedLevel: 0, maxWireLevel: 0 }
```

`체력 +1`과 `10초 무적`은 "레벨"이 아니라 각각 `lives`(기존 Phase 5 state)와 별도의 `itemInvincibleMs`(잔여 시간, ms) 값으로 관리한다.

픽업 시 효과 적용(`Mission1Screen`, 부수효과이므로 여기서 처리):

```ts
function applyItemEffect(type: ItemType) {
  switch (type) {
    case 'spread':
      setUpgrades((u) => ({ ...u, spreadLevel: Math.min(u.spreadLevel + 1, SPREAD_MAX_LEVEL) }))
      break
    case 'fireSpeed':
      setUpgrades((u) => ({ ...u, fireSpeedLevel: Math.min(u.fireSpeedLevel + 1, FIRE_SPEED_MAX_LEVEL) }))
      break
    case 'maxWire':
      setUpgrades((u) => ({ ...u, maxWireLevel: Math.min(u.maxWireLevel + 1, MAX_WIRE_MAX_LEVEL) }))
      break
    case 'heal':
      setLives((l) => Math.min(l + HEAL_AMOUNT, MAX_LIVES))
      break
    case 'invincible':
      // 중첩 없이 무조건 10초로 리필(이미 무적 중이어도 남은 시간을 10초로 되돌림)
      itemInvincibleMsRef.current = ITEM_INVINCIBILITY_DURATION_MS
      setItemInvincibleMs(itemInvincibleMsRef.current)
      break
  }
}
```

레벨형 업그레이드(발수/발사속도/연발)는 이미 최대 레벨(3)이어도 아이템을 또 먹을 수 있다 — 이 경우 `Math.min`에 의해 레벨은 그대로 유지되고 아이템만 소모된다(효과가 "낭비"되는 것이 자연스러운 상한 처리).

## 아이템별 상세 설계

### 발수 증가 (spread)

레벨별 발사 각도는 공식으로 계산하지 않고 아래 고정 표를 그대로 사용한다(수동으로 튜닝된 값).

| 레벨 | 발사 개수 | 각도(도, 0 = 정수직) |
| --- | --- | --- |
| 0(기본) | 1 | `[0]` |
| 1 | 2 | `[-10, 10]` |
| 2 | 3 | `[-15, 0, 15]` |
| 3 | 4 | `[-20, -5, 5, 20]` |

```ts
export const SPREAD_MAX_LEVEL = 3

export const SPREAD_ANGLES_BY_LEVEL: Record<number, number[]> = {
  0: [0],
  1: [-10, 10],
  2: [-15, 0, 15],
  3: [-20, -5, 5, 20],
}

export function getSpreadAngles(spreadLevel: number): number[] {
  return SPREAD_ANGLES_BY_LEVEL[spreadLevel] ?? SPREAD_ANGLES_BY_LEVEL[0]
}

export function getBurstCount(spreadLevel: number): number {
  return getSpreadAngles(spreadLevel).length
}
```

레벨 1은 정중앙(0도) 없이 좌우 10도로만 2발이 나가고, 레벨 2는 정중앙 0도가 다시 포함되며, 레벨 3은 다시 정중앙 없이 4발이 넓게 퍼진다 — 레벨마다 패턴이 균일하지 않으므로 공식이 아닌 표로 관리하는 것이 명확하다.

Wire는 지금까지 수직으로만 움직였으므로(`y`만 변화) `vx` 필드가 없었다. 이제 각도가 있는 Wire를 표현하기 위해 `WireState`에 `vx`를 추가한다.

```ts
type WireState = { id: number; x: number; y: number; vx: number }
```

발사 시 `getSpreadAngles(upgrades.spreadLevel)`의 각 각도만큼 `vx = sin(angleRad) * effectiveWireSpeed`, `vySpeed = cos(angleRad) * effectiveWireSpeed`로 나눠 실은 Wire를 한 번에 여러 개 생성한다(레벨 0이면 각도 `[0]` 하나뿐이라 기존과 동일한 완전 수직 발사).

**Wire 이동/소멸 규칙 갱신**: 이제 Wire가 좌우로도 움직이므로, Phase 2 설계 당시 "Wire는 수직으로만 움직이므로 좌우 벽 충돌은 실질적으로 발생하지 않는다"고 미뤄뒀던 부분이 실제로 필요해진다. `game_rule.md`의 원래 규칙대로 Wire가 좌/우 벽에 닿으면 그 자리에서 소멸하도록 이번에 반영한다.

```ts
const movedWires = wiresRef.current
  .map((wire) => ({ ...wire, x: wire.x + wire.vx * deltaMs, y: wire.y - wire.vy * deltaMs }))
  .filter((wire) => wire.y > 0 && wire.x > 0 && wire.x < GAME_WIDTH)
```

### 발사 속도 30% 향상 (fireSpeed)

```ts
export const FIRE_SPEED_BONUS_PER_LEVEL = 0.3
export const FIRE_SPEED_MAX_LEVEL = 3

export function getEffectiveWireSpeed(fireSpeedLevel: number): number {
  return WIRE_SPEED * (1 + FIRE_SPEED_BONUS_PER_LEVEL * fireSpeedLevel)
}
```

레벨 1=+30%, 레벨 2=+60%, 레벨 3=+90%(가산 방식 — 복리로 곱하지 않아 수치를 예측하기 쉬움). "발사 속도"는 발사 대기시간(연사 간격)이 아니라 Wire가 날아가는 속도(`WIRE_SPEED`)로 해석하는 것으로 확정했다 — 현재 발사 자체는 쿨다운 없이 화면 내 Wire 여유(용량)만으로 제한되므로, 별도의 "연사 간격"이라는 개념 자체가 없기 때문이다.

### 체력 +1 (heal)

```ts
export const HEAL_AMOUNT = 1
export const MAX_LIVES = INITIAL_LIVES // 시작 목숨(5) 이상으로는 회복 불가
```

풀피 상태에서 먹으면 그냥 소모되고 목숨은 늘지 않는다.

### 10초 무적 (invincible)

```ts
export const ITEM_INVINCIBILITY_DURATION_MS = 10_000
```

- 중첩 상한이 없다 — 이미 무적 상태에서 또 먹어도, 아직 무적이 아닐 때 먹어도 결과는 항상 "남은 시간 = 10초"로 고정된다(합산하지 않고 리필). 그래서 별도의 최대 스택/캡 상수가 필요 없다.
- 매 프레임 `itemInvincibleMsRef.current = Math.max(0, itemInvincibleMsRef.current - deltaMs)`로 감소시킨다.
- 머리 위 바의 채움 비율은 `itemInvincibleMs / ITEM_INVINCIBILITY_DURATION_MS`로 계산한다 — 먹는 순간 항상 바가 가득 채워진 상태(1.0)에서 시작해 10초 동안 서서히 줄어든다.
- Phase 5의 "피격 후 2.5초 무적"(`isInvincible`, 깜빡임)과는 별개의 상태로 관리한다. 피격 판정 시 무적 여부는 두 상태를 OR로 합쳐서 판단한다:

```ts
const isImmune = isInvincibleRef.current || itemInvincibleMsRef.current > 0
if (!isImmune && !isGameOverRef.current) {
  // 기존 Bubble 피격 판정
}
```

- 시각적으로는 기존 피격 무적의 깜빡임과 구분되는 골드 톤의 아우라/테두리를 Player에 추가하고, 머리 위에 남은 시간 바(`InvincibilityBar` 컴포넌트, `Wire`/`Bubble`처럼 절대 위치 렌더링)를 띄운다. 바는 `itemInvincibleMs > 0`일 때만 렌더링한다.

### 연발 (maxWire)

```ts
export const BASE_MAX_WIRE_COUNT = 1 // 기존 MAX_WIRE_COUNT를 이름만 변경
export const MAX_WIRE_BONUS_PER_LEVEL = 1
export const MAX_WIRE_MAX_LEVEL = 3

export function getEffectiveMaxWireCount(upgrades: Upgrades): number {
  const fromLevel = BASE_MAX_WIRE_COUNT + upgrades.maxWireLevel * MAX_WIRE_BONUS_PER_LEVEL
  return Math.max(fromLevel, getBurstCount(upgrades.spreadLevel))
}
```

레벨 0→1(기본 1발 제한), 1→2, 2→3, 3→4까지 늘어난다. `Math.max(..., getBurstCount(...))`로 감싸는 이유는 아래 "발수 × 연발 상호작용" 참고.

## 발수 × 연발 상호작용

"연발"이 화면에 동시에 떠 있을 수 있는 Wire 총량(용량)을 의미하므로, 발수 증가로 한 번에 여러 발을 쏘는 순간 그 발사 자체가 용량을 넘어버리면 아무것도 나가지 않는 모순이 생길 수 있다(예: 연발 레벨 0(용량 1)인데 발수 레벨 3으로 4발을 한 번에 쏘려는 경우). 이를 막기 위해 유효 용량(`getEffectiveMaxWireCount`)은 "레벨로 계산한 용량"과 "한 번에 나가는 발수" 중 큰 값을 취하도록 설계한다 — 즉 발수 아이템만 먹어도 그 한 방은 항상 나갈 수 있고, 연발 아이템을 추가로 먹으면 그 위로 여분의 발사(다음 부채꼴 한 번을 더 쏠 수 있는 정도)가 가능해진다.

발사 시도 로직:

```ts
const burstAngles = getSpreadAngles(upgrades.spreadLevel)
const effectiveMaxWireCount = getEffectiveMaxWireCount(upgrades)

if (wiresRef.current.length + burstAngles.length <= effectiveMaxWireCount) {
  // burstAngles 전체를 한 번에 생성(부분 발사 없음)
}
```

## 픽업 표시

Phase 5의 `HitEffect`/`MuzzleFlash`와 같은 패턴으로, 아이템 종류별로 다른 문구의 짧은 텍스트를 위로 떠오르며 사라지게 표시한다(예: `SPREAD+`, `SPEED+`, `+1 HP`, `INVINCIBLE`, `RAPID+`). 실제 효과 적용과 별개로 순수 시각 피드백이다.

## 파일 구조

```
src/
  game/
    constants.ts        # ITEM_DROP_CHANCE, ITEM_TYPES, ITEM_RADIUS, ITEM_GRAVITY, ITEM_MAX_FALL_SPEED, ITEM_DESPAWN_Y,
                         # SPREAD_*, FIRE_SPEED_*, MAX_WIRE_*, HEAL_AMOUNT, MAX_LIVES, ITEM_INVINCIBILITY_DURATION_MS 추가
    upgrades.ts           # Upgrades 타입, INITIAL_UPGRADES, getBurstCount, getSpreadAngles,
                          # getEffectiveWireSpeed, getEffectiveMaxWireCount (모두 순수 함수)
    itemPhysics.ts        # Item 타입(type 필드 포함), stepItem
    Item.tsx               # 아이템 종류별 placeholder 아이콘(색/기호로 구분)
    ItemPickupEffect.tsx   # 획득 시 종류별 문구가 떠오르는 이펙트
    InvincibilityBar.tsx   # 머리 위 무적 잔여시간 바
    collision.ts           # resolveWireBubbleCollisions가 hitPositions도 반환, resolveItemPickups 추가
    Wire.tsx                # vx 반영(각도가 있어도 사각형 자체는 회전 없이 그대로 이동만 — 시각적 회전은 이후 폴리싱 범위)
  screens/
    Mission1Screen.tsx    # upgrades/items/itemInvincibleMs state, 드롭·낙하·픽업·효과 적용, 발사 로직에 burst 반영
    Mission1Screen.css    # .item, 픽업 이펙트, 무적 바, 골드 아우라 스타일
```

## 검수 체크리스트 (PLAN.md 고객 테스트 포인트 + 신규 아이템 기준)

- [ ] Bubble을 여러 번 터뜨렸을 때 대략 5번 중 1번 꼴로 아이템이 나오는지
- [ ] 아이템이 자연스럽게 떨어지다, Player가 닿으면 사라지며 표시가 뜨는지
- [ ] 아이템을 못 받고 캐릭터 높이까지 내려오면(놓치면) 그냥 사라지는지(바닥에 쌓이지 않는지)
- [ ] 발수 증가 아이템을 먹을 때마다 한 번에 나가는 Wire 패턴이 1발(수직)→2발(±10°)→3발(-15/0/15°)→4발(-20/-5/5/20°)로 바뀌는지, 4번째부터는 더 바뀌지 않는지
- [ ] 발사 속도 아이템을 먹을수록 Wire가 더 빠르게 날아가는지(3개 먹으면 확연히 빨라져야 함)
- [ ] 체력 아이템을 먹으면 목숨이 1 늘어나되, 시작 목숨(5)을 넘지 않는지
- [ ] 무적 아이템을 먹으면 머리 위 바가 가득 채워지고 10초에 걸쳐 줄어드는지, 다 줄기 전에 또 먹으면 다시 가득 채워지는지(합산되어 10초보다 길어지지 않는지)
- [ ] 무적 시간 동안 Bubble에 닿아도 목숨이 줄지 않는지
- [ ] 연발 아이템을 먹을수록 화면에 동시에 떠 있을 수 있는 Wire 수가 늘어나는지
- [ ] 발수+연발을 함께(또는 발수만) 먹었을 때도 발사가 씹히지 않고 정상적으로 나가는지
- [ ] Wire가 좌우로 갈라져 나갈 때 벽에 닿으면 사라지는지(수직 발사와 달리 이제 실제로 벽에 닿을 수 있음)

## 확정된 결정 사항

- "발사 속도 30% 향상"은 Wire의 비행 속도(`WIRE_SPEED`) 증가로 확정.
- 발수 증가로 갈라져 나가는 Wire는 스프라이트를 회전시키지 않는다 — 지금처럼 세로로 반듯한 막대 모양 그대로 두고 위치(x, y)만 대각선으로 이동시킨다. 회전 애니메이션은 시각적 디테일이므로 이후 폴리싱 범위로 미룬다.
