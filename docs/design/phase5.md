# Phase 5 설계 - 목숨, 무적, 게임 오버

`PLAN.md`의 Phase 5(목숨, 무적, 게임 오버)를 어떻게 구현할지에 대한 설계 문서. 기준 문서는 `docs/FEATURES/game_rule.md`(Player 피격/무적 규칙, 패배 조건).

## 목표 (재확인)

Player가 Bubble에 닿으면 목숨이 줄고, 차감 직후 2.5초간 무적 상태가 되며, 목숨이 0이 되면 게임 오버가 되는 패배 루프를 완성한다.

## 범위

**포함**
- Player ↔ Bubble 충돌 판정(닿으면 목숨 1개 차감, 초기 목숨 5개)
- 목숨 차감 시 2.5초 무적(무적 중 접촉은 무시), 무적 중 시각적 표시(깜빡임)
- 목숨이 0이 되면 게임 오버 화면/메시지 표시
- 화면에 남은 목숨 수를 보여주는 최소한의 HUD(하트 아이콘 없이 텍스트로 우선 표시)

**제외 (다음 Phase 이후)**
- 아이템 드롭 (Phase 6)
- 게임 오버/클리어 화면에서 메인으로 복귀하는 동선 (Phase 7)

## 충돌 판정

Player는 사각형(`left = playerX - PLAYER_WIDTH/2, top = PLAYER_Y, width = PLAYER_WIDTH, height = PLAYER_HEIGHT`, `Player.tsx` 렌더링과 동일), Bubble은 원이므로 Phase 4에서 만든 `circleIntersectsRect`를 그대로 재사용한다. 현재 `collision.ts`에는 이 함수가 모듈 내부 전용(`export` 없음)이므로 재사용을 위해 export로 변경한다.

```ts
// src/game/collision.ts (export 추가)
export function circleIntersectsRect(/* ... 기존과 동일 ... */): boolean { /* ... */ }

// 새로 추가
export function findBubbleHittingPlayer(
  playerRect: { left: number; top: number; width: number; height: number },
  bubbles: Bubble[],
): Bubble | undefined {
  return bubbles.find((bubble) =>
    circleIntersectsRect(
      bubble.x, bubble.y, BUBBLE_RADIUS[bubble.size],
      playerRect.left, playerRect.top, playerRect.width, playerRect.height,
    ),
  )
}
```

- Bubble이 Player에 닿아도 Bubble 자체의 물리(속도/방향)는 변하지 않는다(`game_rule.md`에 Player-Bubble 충돌 시 Bubble 반응에 대한 규칙이 없음 — 피격은 Player 쪽에서만 처리).

## 무적 처리

- `isInvincible: boolean` state와, 남은 무적 종료를 처리할 `setTimeout` 하나를 사용한다(기존 `MuzzleFlash` 제거 타이머와 동일한 패턴 — `invincibleTimeoutRef`로 보관하고 언마운트 시 정리).
- 피격 처리 흐름(게임 루프 tick 안, Wire/Bubble 충돌 처리 다음 순서로):

```ts
if (!isInvincibleRef.current && !isGameOverRef.current) {
  const hitBubble = findBubbleHittingPlayer(playerRect, nextBubbles)
  if (hitBubble) {
    setLives((current) => {
      const next = current - 1
      if (next <= 0) setIsGameOver(true)
      return next
    })
    setIsInvincible(true)
    isInvincibleRef.current = true
    clearTimeout(invincibleTimeoutRef.current)
    invincibleTimeoutRef.current = setTimeout(() => {
      setIsInvincible(false)
      isInvincibleRef.current = false
    }, INVINCIBILITY_DURATION_MS)
  }
}
```

- `isInvincibleRef`/`isGameOverRef`를 별도로 두는 이유: 게임 루프 tick은 매 프레임 실행되는데, 그 안에서 매번 최신 `isInvincible`/`isGameOver` 값을 즉시 참조해야 하기 때문(Phase 4에서 `wiresRef`/`bubblesRef`를 둔 것과 같은 이유 — state는 다음 렌더까지 갱신이 늦어질 수 있음).
- 무적 중에는 Player에 CSS 클래스(`player--invincible`)를 추가해 깜빡이는 애니메이션을 적용한다.

## 목숨 및 게임 오버

- `lives: number` state, 초기값 `INITIAL_LIVES = 5`.
- `isGameOver: boolean` state. `lives`가 0 이하가 되는 순간 `true`로 설정하고, 이후 피격 판정 자체를 건너뛴다(위 조건문의 `!isGameOverRef.current`).
- 게임 오버 시 Phase 4의 `clear-overlay`와 같은 방식으로 `game-over-overlay`를 표시("GAME OVER" 텍스트). 클리어와 게임 오버가 동시에 뜰 일은 없다(목숨이 남아있어야 클리어가 나므로 상호 배타적).
- HUD: 게임 영역 상단에 `목숨: {lives}` 형태의 간단한 텍스트로 표시(하트 아이콘 등 비주얼은 이후 다듬어도 되는 범위 — 아래 "열린 질문" 참고).

## 상태/파일 변경 요약

```
src/
  game/
    constants.ts      # INITIAL_LIVES = 5, INVINCIBILITY_DURATION_MS = 2500 추가
    collision.ts       # circleIntersectsRect export로 변경, findBubbleHittingPlayer 추가
    Player.tsx         # isInvincible prop 추가 → 조건부 className
  screens/
    Mission1Screen.tsx # lives/isInvincible/isGameOver state, 관련 ref/타이머, 충돌 판정 tick에 추가, HUD/오버레이 렌더링
    Mission1Screen.css # HUD 텍스트 스타일, player--invincible 깜빡임 애니메이션, game-over-overlay 스타일
```

## 검수 체크리스트 (PLAN.md 고객 테스트 포인트 매핑)

- [ ] Bubble에 닿으면 목숨이 정확히 1개만 줄어드는지(HUD 숫자로 확인)
- [ ] 피격 직후 2.5초 동안은 Bubble에 계속 닿아 있어도 목숨이 추가로 줄지 않는지
- [ ] 무적 중에는 캐릭터가 깜빡이는 등 시각적으로 구분되는지, 2.5초 후 원래대로 돌아오는지
- [ ] 목숨이 0이 되면 게임 오버 화면이 뜨는지
- [ ] 게임 오버 후에는 더 이상 목숨이 줄거나 화면이 바뀌지 않는지(고정된 상태 유지)

## 열린 질문 (검토 시 확인 필요)

1. 목숨 HUD를 이번 Phase에서는 텍스트("목숨: 5")로 우선 구현하고, 하트 아이콘 등 비주얼은 이후 다듬어도 되는지
2. 무적 상태의 깜빡임 효과(속도/투명도 변화 폭)는 임의값으로 구현 후 조정해도 되는지
3. 게임 오버 시 Bubble 물리(낙하/튕김) 자체는 계속 진행되도록 둘지(Phase 4의 클리어 화면과 동일하게 배경은 계속 움직이고 오버레이만 뜨는 방식), 아니면 이 시점에 완전히 정지시킬지
