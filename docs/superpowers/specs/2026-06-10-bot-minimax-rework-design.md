# Bot Minimax Rework — Design Spec

**Date:** 2026-06-10
**Branch:** `bot-smart-enhance`
**Status:** Implemented (see deviations below)

> **Implementation deviations (2026-06-11):** Candidate pruning was widened
> during validation (K = 24 root / 16 node + a 6-move quota + never-pruned
> escapes, vs the K = 12/8 sketched below) after self-play exposed pruning
> pathologies (Poro/piece escapes starved out). Expert preset is depth 4 /
> 20 s, not unbounded. The harness validates deep-vs-shallow (d3 vs d1)
> rather than k vs k+1. Minion-synergy and explicit item-value evaluation
> components were deferred; an economy component (gold + ready skills) was
> added instead. The 80% self-play gate landed at ~59-70% vs a baseline
> that itself benefits from this branch's evaluator fixes — see the final
> branch report for the full numbers and analysis.

## Problem

The current bot plays badly because its production search (`searchV2` in
`packages/bot-engine/src/search/BestMoveSearch.ts`) is a 1-ply greedy loop:
it simulates each legal action once, evaluates the result, and picks the
highest score. It never considers opponent replies, so it cannot see traps,
losing exchanges, or multi-turn threats. The `searchDepth` difficulty knob is
dead code. On top of this, the evaluation has concrete bugs:

- A 10x panic multiplier on Poro safety (`PositionEvaluator.ts:392-397`)
  collapses the whole evaluation whenever the Poro is mildly threatened.
- Allied piece safety is penalized by `damageTargetPriorityFactor`
  (`PositionEvaluator.ts:399`) — a sign/logic error that punishes owning
  strong pieces.
- `ThreatEvaluator` counts only the top 3 threats.
- `LoSEvaluator` scores line-of-sight onto empty squares the same as onto
  targets.
- `MoveOrdering` is computed but never used; a recursive `search()` method
  exists but is never called.

## Goal

One maximally strong bot. Thinking time is allowed to be high (time limit is
configurable; iterative deepening makes any budget safe). Difficulty presets
remain mechanically functional (depth/time/randomness knobs) but only the
strongest setting gets tuning attention.

**Acceptance gate:** the new bot beats the old bot in >= 80% of decided
self-play games over a seeded match batch.

## Approach

Iterative-deepening negamax with alpha-beta pruning, using the game engine
(`gameEngine.processAction` on cloned state) as the rules oracle. The search
never reimplements rules — diagonal minion attacks, cooldowns, items,
resistances, special items, etc. are all honored automatically because the
real engine applies them during simulation. Game mechanics enter the bot in
exactly three places: action generation (already engine-backed), simulation
(engine-backed), and the evaluation function.

## Section 1: Search core

New `AlphaBetaSearch` replaces `searchV2` as the production search. The dead
`search()`/`searchV2` paths are deleted from the production flow; the old
greedy search is retained temporarily under a `LegacySearch` name solely as
the self-play benchmark opponent, and removed once the rework is validated.
The `Minimax` export name is kept for compatibility.

- **Iterative deepening:** search depth 1, then 2, then 3, ... until the time
  budget is spent. The last *completed* depth's best move is always
  available, so the time limit is respected exactly. The previous iteration's
  best move is searched first in the next iteration (alpha-beta efficiency).
- **Negamax with alpha-beta:** each node's side-to-move picks its best
  action; scores negate between plies. Requires the symmetric evaluation
  defined in Section 2.
- **Candidate pruning:** at each node all legal actions are generated, scored
  by the (now actually used) `MoveOrdering` heuristic, and only the top K
  expanded — K ~= 12 at the root, ~= 8 at deeper plies. Forcing actions are
  never pruned: kills available this turn, attacks on the enemy Poro, and
  escape moves for a piece under lethal threat.
- **Combat extension (quiescence):** when nominal depth is exhausted but the
  position is hot (a piece can be killed this turn, or a Poro is attackable),
  the search extends with kill/Poro-attack actions only, up to a small fixed
  number of extra plies. Prevents horizon-effect blunders in multi-hit
  exchanges.
- **Crit determinism:** the search clone has crit chance neutralized so
  random crits cannot pollute the tree; evaluation prices crit in as expected
  damage (AD x (1 + critChance x (critDamage - 1))).
- **Terminal detection:** a dead Poro in simulation returns a mate score
  (large magnitude, adjusted by depth so faster mates score higher), making
  the bot close out won games.
- **Out-of-tree decisions:** item purchases (`ItemStrategy`) and summoner
  spells (`SummonerSpellStrategy`) are decided per-turn before the board
  action, as today. Exception: Flash/escape decisions are sanity-checked
  against the search result so the bot does not Flash out and walk back in.

Performance expectation: `processAction` deep-clones state (~ms per node).
With K = 8-12 and alpha-beta, depth 3 is roughly 1-5k nodes — a few seconds,
within budget, degrading gracefully via iterative deepening.

## Section 2: Evaluation rework

`PositionEvaluator` remains the composition point. All component scores are
computed symmetrically (my score minus opponent score) from the perspective
of the player passed in, so negamax sign-flipping is sound.

**Bug fixes:**

- Remove the 10x Poro-safety panic multiplier; Poro danger becomes a smooth,
  strong-but-bounded penalty. Lethal threats are the search's job to see,
  not the evaluation's job to panic about.
- Fix the allied-safety `damageTargetPriorityFactor` sign error.
- `ThreatEvaluator` counts all threats with diminishing weights instead of
  top-3 only.
- `LoSEvaluator` scores line-of-sight only onto squares that matter (enemy
  pieces, monster pits, Poro approach lanes).

**Components, in rough descending weight:**

1. **Effective material** — per piece: `baseValue x f(hp%)`; champions add
   equipped-item value to baseValue; a ready (off-cooldown) skill adds a
   small premium.
2. **Poro safety** — distance-weighted enemy threat on the Poro, count of
   escape squares, shield status. Strong but linear; no cliffs.
3. **Kill threats** — expected damage my pieces can land next turn vs.
   theirs, using expected-value crit math.
4. **Economy** — gold in bank (small weight) and item completion progress.
5. **Objectives** — Drake/Baron control: damage-on-monster potential vs.
   opponent's, Smite availability, buff value. Weight ramps as spawn turns
   approach.
6. **Promotion** — existing `PassedPawnEvaluator` with the
   obstacle-blind threat-distance fix; weight scales up in the late game.
7. **Minion synergy** — adjacency formation value (+15 AD/resists per
   adjacent ally is a real rule).

**Tuning method:** weights start from sensible values and are iterated via
the self-play harness — change one weight, run a seeded batch, keep the
change only if win rate improves. No unexplained magic constants.

## Section 3: Integration, self-play harness, testing

**Integration:**

- `BotEngine.getAction(game, botPlayerId)` keeps its exact signature;
  `apps/backend/src/game/simple-bot.service.ts` needs no changes beyond
  package rebuilds.
- Difficulty presets become functional: they set max depth, time limit, and
  randomness for iterative deepening (easy: depth 1 + randomness; expert:
  unbounded depth, large time limit). Only expert is tuned.
- Turn flow inside `getAction` is unchanged: spell check, item buy, then
  board-action search.

**Self-play harness** (`npm run selfplay` in `packages/bot-engine`):

- New bot vs. `LegacySearch` over N seeded games; also new-at-depth-k vs.
  new-at-depth-(k+1) as a sanity check (deeper must win more).
- Fixed champion pool per seed (skips ban/pick), alternating colors, game
  length cap (~200 turns counts as a draw).
- Reports win/loss/draw, average game length, average move time.
- This is the acceptance gate (>= 80% of decided games vs. old bot).

**Tests** (Jest in `packages/bot-engine` — the package already declares a
`test: jest` script but ships no config; this work adds a jest config and
`*.spec.ts` files there, next to the code under test):

- Evaluation symmetry: `eval(game, A) === -eval(game, B)` across sampled
  positions.
- Tactical scenarios with one unambiguous best move: take the free kill;
  refuse a losing exchange; escape a 2-move Poro mate; secure Drake when
  Smite guarantees it.
- Determinism: same game + same seed yields the same chosen action.

**Error handling:**

- `processAction` failure during search = skip that branch, never crash.
- Time budget expiring mid-iteration = return the last completed depth's
  move.
- Total failure fallback = first legal action; the backend must always
  receive an action.

## Out of scope

- Ban/pick strategy improvements (`BanPickStrategy` untouched).
- Item recipe/shop strategy redesign (`ItemStrategy` untouched except where
  the audit noted the both-players phase-detection bug, which may be fixed
  opportunistically).
- Tuning of easy/medium/hard for distinct feel.
- MCTS or learned evaluation.
