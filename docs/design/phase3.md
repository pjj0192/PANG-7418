# Phase 3 설계 - Bubble 물리 (충돌 없이 움직임만)

`PLAN.md`의 Phase 3(Bubble 물리)를 어떻게 구현할지에 대한 설계 문서. 기준 문서는 `docs/FEATURES/game_rule.md`(Bubble 규칙), `docs/FEATURES/mission1.md`(큰 Bubble 1~2개).

## 목표 (재확인)

Bubble이 중력을 받아 포물선으로 낙하하고, 바닥/벽에 튕기며 직전과 같은 높이로 재상승하는 물리를 구현한다. 이 Phase에서는 Wire/Player와의 충돌 처리를 하지 않는다(겹쳐도 아무 반응 없는 것이 정상).

## 범위

**포함**
- 큰 Bubble 1~2개를 게임 영역에 배치
- 중력 적용(낙하), 바닥/좌우 벽에 닿으면 반사(에너지 손실 없이 같은 높이까지 재상승)
- 화면(게임 영역) 상/하/좌/우 경계를 벗어나지 않음

**제외 (다음 Phase 이후)**
- Wire ↔ Bubble 충돌/분할 (Phase 4)
- Player ↔ Bubble 충돌/목숨 차감 (Phase 5)
- 중간/작은 크기 Bubble (분할로만 등장하므로 Phase 4에서 다룸) — 다만 크기 단계 자체는 이번에 타입으로 미리 정의해 확장에 대비(아래 "크기 단계" 참고)
- Block(장애물) — Mission 1 범위 밖

## 물리 모델

Bubble마다 위치 `(x, y)`와 속도 `(vx, vy)`를 가지는 단순 발사체 운동으로 구현한다. `(x, y)`는 Bubble 중심 좌표, 반지름은 크기 단계별로 고정.

매 프레임(`deltaMs`)마다:
1. `vy += GRAVITY * deltaMs` (중력 가속)
2. `x += vx * deltaMs`, `y += vy * deltaMs`
3. 경계 충돌 검사 및 반사(아래 "경계 반사" 참고)

```ts
// 개념 예시
function stepBubble(bubble: Bubble, deltaMs: number): Bubble {
  let { x, y, vx, vy } = bubble
  vy += GRAVITY * deltaMs
  x += vx * deltaMs
  y += vy * deltaMs

  const r = BUBBLE_RADIUS[bubble.size]

  if (x - r < 0) {
    x = r
    vx = Math.abs(vx)
  } else if (x + r > GAME_WIDTH) {
    x = GAME_WIDTH - r
    vx = -Math.abs(vx)
  }

  if (y - r < 0) {
    y = r
    vy = Math.abs(vy)
  } else if (y + r > GAME_HEIGHT) {
    y = GAME_HEIGHT - r
    vy = -Math.abs(vy)
  }

  return { ...bubble, x, y, vx, vy }
}
```

**"같은 높이로 재상승"이 성립하는 원리**: 바닥에 닿는 순간 위치를 경계선에 clamp하고, 속도의 크기(에너지)는 유지한 채 방향(부호)만 반전시킨다. 감쇠(edamping) 계수를 곱하지 않으므로 이론적으로 직전과 동일한 높이까지 튀어 오른다. 다만 `deltaMs` 기반 이산 시간 스텝의 특성상 프레임마다 약간의 오차가 누적될 수 있음 — 브라우저 프레임레이트에서는 육안으로 체감되지 않는 수준일 것으로 예상하고, 실제 플레이 시 눈에 띄게 어긋나면 그때 고정 타임스텝(fixed timestep) 도입을 검토한다(아래 "열린 질문" 참고).

## 크기 단계

`game_rule.md`에 따라 큰 → 중간 → 작은 3단계가 있다. Phase 3에서는 큰 Bubble만 등장하지만, Phase 4의 분할 로직이 자연스럽게 이어지도록 크기를 타입/상수로 미리 정의한다(Phase 2에서 Wire를 배열로 미리 설계해둔 것과 같은 이유).

```ts
export type BubbleSize = 'large' | 'medium' | 'small'

export const BUBBLE_RADIUS: Record<BubbleSize, number> = {
  large: 32,
  medium: 22,
  small: 14,
}
```

## 상태 설계 (Mission1Screen)

- `bubbles: { id: number; x: number; y: number; vx: number; vy: number; size: BubbleSize }[]`
- 초기값: 큰 Bubble 1~2개를 게임 영역 상단 근처, 서로 다른 위치/수평 속도로 배치(각각 반대 방향으로 움직이도록 `vx` 부호를 다르게 주면 자연스러워 보임)
- 게임 루프 tick마다 `bubbles`를 `stepBubble`로 갱신(Player/Wire와 동일하게 `setBubbles((current) => current.map((b) => stepBubble(b, deltaMs)))`)
- 이 Phase에서는 Bubble 개수가 줄어들 일이 없으므로(분할/소멸 없음) 배열 길이는 고정

## 파일 구조

```
src/
  game/
    constants.ts        # GRAVITY, BUBBLE_RADIUS, 초기 속도 범위 등 추가
    bubblePhysics.ts     # BubbleSize 타입, Bubble 타입, stepBubble 순수 함수(테스트/재사용 목적으로 컴포넌트와 분리)
    Bubble.tsx           # size에 따른 지름의 원(placeholder)을 절대 위치로 렌더링
  screens/
    Mission1Screen.tsx   # bubbles 상태 추가, 게임 루프에 stepBubble 적용, Bubble 렌더링 추가
    Mission1Screen.css   # .bubble 스타일(크기별 지름은 인라인 style로, 색상/그림자는 CSS로)
```

- `bubblePhysics.ts`를 컴포넌트와 분리하는 이유: Phase 4에서 Wire 충돌 시 분할된 새 Bubble을 만드는 로직, Phase 5의 Player 충돌 판정 등이 이 순수 물리 함수를 그대로 재사용하게 된다.

## 렌더링

- Bubble은 원형 `div`(placeholder, 이미지 없음)로 시각화. 크기별 지름은 `BUBBLE_RADIUS[size] * 2`.
- z-index는 Wire/Player와 같은 레이어(겹쳐도 시각적으로만 겹칠 뿐 상호작용 없음 — 이 Phase에서는 순서가 중요하지 않음).

## 검수 체크리스트 (PLAN.md 고객 테스트 포인트 매핑)

- [ ] Bubble이 포물선을 그리며 낙하하다가 바닥에서 튕겨 오르는지("공처럼" 튀는 느낌)
- [ ] 바닥에 튕긴 후 직전과 비슷한 높이까지 다시 올라가는지(눈에 띄게 낮아지거나 높아지지 않는지)
- [ ] 좌/우 벽에 닿으면 방향이 반전되는지
- [ ] 화면 위/아래/좌/우 경계를 벗어나거나 벽에 끼어 멈추는 등 이상 동작이 없는지
- [ ] Bubble이 Player나 Wire와 겹쳐도 아무 일도 일어나지 않는지(정상 동작)

## 열린 질문 (검토 시 확인 필요)

1. Mission 1 시작 시 Bubble을 1개로 할지 2개로 할지(`mission1.md`는 "1~2개"로 폭을 둠) — 우선 2개로 구현해보고 난이도 체감에 따라 조정하는 방식으로 진행해도 되는지
2. 중력 세기, 초기 속도 등 구체적인 수치는 Phase 2와 마찬가지로 임의값으로 구현 후 플레이하며 조정해도 되는지
3. 바닥 반사 시 높이가 프레임레이트에 따라 미세하게 어긋나는 문제가 실제로 체감된다면, 고정 타임스텝 도입 등 정밀도 개선 작업을 이번 Phase에 포함할지 아니면 이후로 미룰지
