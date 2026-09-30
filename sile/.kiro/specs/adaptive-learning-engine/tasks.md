# Implementation Plan: Adaptive Learning Engine (Phase 2 Completion)

## Overview

This plan completes the Phase 2 Adaptive Learning Engine by adding four integration gaps as an **additive** layer on top of the existing, passing workflow. Work proceeds bottom-up: first the additive foundations (config settings, nullable model columns, optional Pydantic v2 response fields) that carry zero regression risk, then each new pure component in `app/services/adaptive/` built together with its unit and Hypothesis property tests, then wiring into `PracticeService` and `LearningPathGenerator`, and finally the new audit-suite assertions plus a full regression run. Optional frontend integration-verification tasks close the list.

All property tests use Hypothesis at >= 100 iterations and are tagged **Feature: adaptive-learning-engine, Property {n}**. Every change preserves `backend/tests/test_phase2_audit.py` passing.

## Tasks

- [ ] 1. Add additive configuration settings
  - Add `SESSION_STEP_UP_THRESHOLD` (3), `SESSION_STEP_DOWN_THRESHOLD` (3), `SPACED_REPETITION_INTERVAL_DAYS` (3), `DEFAULT_PRACTICE_BATCH_SIZE` (5), `SLOW_LEARNER_PER_TOPIC_ITEM_CAP` (1) to `Settings` in `backend/app/core/config.py`
  - Document clamp ranges in comments (step thresholds 1..10, interval 1..90)
  - _Requirements: 1.2, 1.3, 1.8, 4.1, 4.2_

- [ ] 2. Add additive, nullable model columns
  - [ ] 2.1 Add nullable columns to `PracticeAttempt`
    - Add `session_adjustments: Mapped[Optional[dict]]` (JSON, nullable) and `final_session_difficulty: Mapped[Optional[ContentDifficulty]]` (nullable enum) in the practice model module
    - Ensure defaults are `None` so existing rows/serialization are unaffected
    - _Requirements: 1.6, 5.2_
  - [ ] 2.2 Add nullable column to `LearningPath`
    - Add `cyclic_dependency_detected: Mapped[Optional[bool]]` defaulting to `None`/`False`
    - _Requirements: 2.2, 5.2_
  - [ ]* 2.3 Write model regression test for additive columns
    - Assert new columns are nullable and that existing model instantiation/serialization is unchanged
    - _Requirements: 5.2_

- [ ] 3. Add additive Pydantic v2 response fields
  - [ ] 3.1 Extend practice schemas
    - Add `worked_examples`, `scaffolding_steps`, `scaffolding_is_fallback`, `initial_session_difficulty` to `PracticeSessionResponse`; add `final_session_difficulty`, `session_difficulty_adjustments`, `resequence_applied`, `resequence_count_constraint_violated`, `pacing_fell_back_to_defaults` to `PracticeResultResponse`
    - All fields `Optional`/defaulted so absence preserves prior shape
    - _Requirements: 1.1, 1.6, 2.4, 2.8, 3.1, 3.4, 4.6, 5.2_
  - [ ] 3.2 Extend learning-path and performance schemas
    - Add `scaffolding_steps`, `scaffolding_is_fallback` to `LearningPathItemResponse`; add `cyclic_dependency_detected` to `LearningPathResponse`; add `spaced_repetition_due` to `LearnerPerformanceOverviewResponse`
    - _Requirements: 1.8, 2.2, 3.2, 3.4, 5.2_
  - [ ]* 3.3 Write schema-stability test
    - Assert `PracticeResultResponse` and `LearningPathResponse` still expose the pre-existing named fields with original types
    - _Requirements: 5.2, 5.3_

- [ ] 4. Create the adaptive package skeleton
  - Create `backend/app/services/adaptive/__init__.py` and shared `DIFFICULTY_ORDER` constant referencing `ContentDifficulty`
  - _Requirements: 1.7_

- [ ] 5. Implement SessionDifficultyController
  - [ ] 5.1 Implement the controller
    - Create `backend/app/services/adaptive/session_difficulty.py` with `DifficultyAdjustment`, `SessionDifficultyController`, `record_answer`, `final_difficulty`, and `for_initial_mastery` (seeds via `PerformanceAnalyzer.determine_topic_difficulty`, clamps thresholds 1..10)
    - Implement bounded step-up/step-down with counter resets and clamping at BEGINNER/ADVANCED
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7_
  - [ ]* 5.2 Write property test for initial calibration
    - **Property 1: Initial session difficulty matches mastery calibration**
    - **Validates: Requirements 1.1**
  - [ ]* 5.3 Write property test for bounded stepping
    - **Property 2: Bounded single-step difficulty adjustment**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.7, 5.4**
  - [ ]* 5.4 Write property test for adjustment-log replay
    - **Property 3: Adjustment log replays to the recorded final difficulty**
    - **Validates: Requirements 1.6**
  - [ ]* 5.5 Write boundary example tests
    - Explicit ADVANCED-raise-holds and BEGINNER-lower-holds cases
    - _Requirements: 1.4, 1.5_

- [ ] 6. Implement SpacedRepetitionScheduler
  - [ ] 6.1 Implement the scheduler
    - Create `backend/app/services/adaptive/spaced_repetition.py` with `surface_due_topics` (older-than-interval filter, oldest-first order, excludes null `last_attempted_at`, clamps interval 1..90)
    - _Requirements: 1.8_
  - [ ]* 6.2 Write property test for surfacing
    - **Property 4: Spaced-repetition surfacing is complete and oldest-first**
    - **Validates: Requirements 1.8**

- [ ] 7. Implement PrerequisiteSequencer
  - [ ] 7.1 Implement topological ordering
    - Create `backend/app/services/adaptive/prerequisite_sequencer.py` with `order_topics` returning `(ordered, cyclic_detected)`: Kahn's algorithm over `Topic.prerequisite_topic_id`, ties broken by ascending `order_number`; cyclic fallback to `order_number` sort with `cyclic_detected=True`
    - _Requirements: 2.1, 2.2_
  - [ ]* 7.2 Write property test for topological ordering
    - **Property 5: Prerequisite topological ordering**
    - **Validates: Requirements 2.1, 5.5**
  - [ ]* 7.3 Write property test for cyclic fallback
    - **Property 6: Cyclic dependency fallback**
    - **Validates: Requirements 2.2**

- [ ] 8. Implement PathResequencer
  - [ ] 8.1 Implement re-sequencing
    - Create `backend/app/services/adaptive/path_resequencer.py` with `ResequenceOutcome`, `needs_resequence`, and `resequence` (reorder PENDING-only by mastery gap + prerequisite order; preserve COMPLETED/IN_PROGRESS/SKIPPED sequence and status; reject and flag when resulting count would leave 5..10)
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8_
  - [ ]* 8.2 Write property test for status preservation
    - **Property 7: Re-sequence preserves non-PENDING items and reorders only PENDING items**
    - **Validates: Requirements 2.5, 2.6**
  - [ ]* 8.3 Write property test for count bounds
    - **Property 8: Re-sequence keeps item count within bounds**
    - **Validates: Requirements 2.7, 2.8**
  - [ ]* 8.4 Write example tests for trigger and rejection
    - Stale-vs-fresh ordering triggers/skips re-sequence (R2.4); forced count-violation retains prior ordering (R2.8)
    - _Requirements: 2.4, 2.8_

- [ ] 9. Implement ScaffoldingProvider
  - [ ] 9.1 Implement the provider
    - Create `backend/app/services/adaptive/scaffolding_provider.py` with `ScaffoldingBundle`, async `build` (bridges `ContentAdaptationAgent`, clamps examples 1..5 and steps 1..10, inserts one `kind="prereq"` step first on prerequisite gap, passes `simplified_language`/`full_steps` flags), and `_deterministic_fallback` (per-topic-stable, `is_fallback=True`, never raises)
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 4.4_
  - [ ]* 9.2 Write property test for count bounds and ordering
    - **Property 9: Scaffolding content respects count bounds and ordering**
    - **Validates: Requirements 3.1, 5.7**
  - [ ]* 9.3 Write property test for prerequisite-review placement
    - **Property 11: Prerequisite-review step placement**
    - **Validates: Requirements 3.3**
  - [ ]* 9.4 Write property test for deterministic fallback
    - **Property 12: Deterministic, order-stable fallback scaffolding**
    - **Validates: Requirements 3.4**
  - [ ]* 9.5 Write example test for simplified-language wiring
    - Spy/mock asserts `simplified_language` flag is passed to `build` (R4.4)
    - _Requirements: 4.4_

- [ ] 10. Implement SlowLearnerSupport
  - [ ] 10.1 Implement pace/preference resolution
    - Create `backend/app/services/adaptive/slow_learner_support.py` with `PacingDecision` and `resolve` (SLOW batch `max(3, default//2)`, per-topic cap, `full_scaffolding`, `simplified_language`, `prefer_short_sessions`, `fell_back_to_defaults` on unresolved inputs, defaults for MODERATE/FAST)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [ ]* 10.2 Write property test for batch sizing
    - **Property 14: Slow-learner batch sizing**
    - **Validates: Requirements 4.1**
  - [ ]* 10.3 Write property test for strictly-smaller batch
    - **Property 18: Slow pace yields a strictly smaller batch than default**
    - **Validates: Requirements 4.7, 5.6**
  - [ ]* 10.4 Write example tests for fallback and defaults
    - Unresolved pace/preferences sets fallback flag (R4.6); MODERATE/FAST with no flags equals defaults (R4.7)
    - _Requirements: 4.6, 4.7_

- [ ] 11. Checkpoint - Ensure all component tests pass
  - Run the adaptive component unit and property tests; ensure all pass, ask the user if questions arise.

- [ ] 12. Wire adaptive components into PracticeService
  - [ ] 12.1 Wire generation flow
    - In `generate_practice_session`: seed `SessionDifficultyController.for_initial_mastery`, resolve batch size via `SlowLearnerSupport`, attach `ScaffoldingProvider` bundle and `initial_session_difficulty` to the response
    - _Requirements: 1.1, 3.1, 4.1, 4.3, 4.4_
  - [ ] 12.2 Wire submission flow
    - In `submit_practice_session`: replay answers through the controller, persist `session_adjustments` and `final_session_difficulty`, populate result fields, and invoke `PathResequencer` on the active path within the submit transaction; surface `SpacedRepetitionScheduler` results and `pacing_fell_back_to_defaults`
    - _Requirements: 1.6, 1.8, 2.3, 2.4, 2.8, 4.6_
  - [ ]* 12.3 Write property test for scaffolding additivity
    - **Property 13: Scaffolding is purely additive**
    - **Validates: Requirements 3.5, 5.2**
  - [ ]* 12.4 Write timing integration test for re-sequence
    - Submit a mastery-changing attempt for the seeded demo learner; assert active-path re-sequence runs within the 3-second budget (R2.3)
    - _Requirements: 2.3_

- [ ] 13. Wire adaptive components into LearningPathGenerator
  - [ ] 13.1 Wire generation and presentation
    - In `generate_path`: order topics via `PrerequisiteSequencer` (record `cyclic_dependency_detected`), apply `SlowLearnerSupport` per-topic cap and short-session tie-break, attach `ScaffoldingProvider` steps to item responses
    - _Requirements: 2.1, 2.2, 3.2, 4.2, 4.5_
  - [ ]* 13.2 Write property test for path-item scaffolding structure
    - **Property 10: Path-item scaffolding uses the same ordered structure**
    - **Validates: Requirements 3.2**
  - [ ]* 13.3 Write property test for per-topic item cap
    - **Property 15: Slow-learner per-topic item cap**
    - **Validates: Requirements 4.2**
  - [ ]* 13.4 Write property test for full scaffolding when step-by-step enabled
    - **Property 16: Full scaffolding when step-by-step is enabled**
    - **Validates: Requirements 4.3**
  - [ ]* 13.5 Write property test for short-session selection
    - **Property 17: Short-session minimum-duration selection**
    - **Validates: Requirements 4.5**

- [ ] 14. Surface spaced-repetition on the performance overview
  - Populate `spaced_repetition_due` on `LearnerPerformanceOverviewResponse` via `SpacedRepetitionScheduler`, reading `TopicPerformance.last_attempted_at`, without altering existing overview fields
  - _Requirements: 1.8, 5.2_

- [ ] 15. Add new audit-suite assertions (R5.4-R5.7)
  - Add targeted tests alongside `backend/tests/test_phase2_audit.py`: difficulty +-1 bounded stepping (R5.4), prerequisite-before-dependents ordering (R5.5), SLOW batch strictly smaller than non-SLOW (R5.6), practice response contains >=1 scaffolding step (R5.7)
  - _Requirements: 5.4, 5.5, 5.6, 5.7_

- [ ] 16. Final checkpoint - Confirm no regressions
  - Run `pytest backend/tests/test_phase2_audit.py` and confirm 100% pass within 120 seconds, then run the full backend test suite; ensure all tests pass, ask the user if questions arise.
  - _Requirements: 5.1, 5.3_

- [ ]* 17. Frontend integration verification (optional)
  - [ ]* 17.1 Verify practice page consumes new fields
    - Confirm the React 18 + TS practice page renders `worked_examples`/`scaffolding_steps` and tolerates absent fields; add/adjust a component test
    - _Requirements: 3.1, 3.5_
  - [ ]* 17.2 Verify learning-path page consumes new fields
    - Confirm path items render scaffolding steps and `cyclic_dependency_detected`; add/adjust a component test
    - _Requirements: 2.2, 3.2_
  - [ ]* 17.3 Verify performance page consumes spaced-repetition
    - Confirm the performance page renders `spaced_repetition_due`; add/adjust a component test
    - _Requirements: 1.8_

## Notes

- Tasks marked with `*` are optional (tests and optional frontend verification) and can be skipped for a faster MVP, though property tests are strongly recommended to guarantee the 18 correctness properties.
- Each task references specific requirements and, where applicable, the exact design correctness property it implements.
- All model, schema, and config additions are additive/nullable to preserve `backend/tests/test_phase2_audit.py` (Requirement 5).
- Checkpoints (tasks 11 and 16) ensure incremental validation and a final regression confirmation.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "4"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1", "3.2"] },
    { "id": 2, "tasks": ["2.3", "3.3", "5.1", "6.1", "7.1", "8.1", "9.1", "10.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "5.4", "5.5", "6.2", "7.2", "7.3", "8.2", "8.3", "8.4", "9.2", "9.3", "9.4", "9.5", "10.2", "10.3", "10.4"] },
    { "id": 4, "tasks": ["12.1", "12.2", "14"] },
    { "id": 5, "tasks": ["12.3", "12.4", "13.1"] },
    { "id": 6, "tasks": ["13.2", "13.3", "13.4", "13.5"] },
    { "id": 7, "tasks": ["15"] },
    { "id": 8, "tasks": ["17.1", "17.2", "17.3"] }
  ]
}
```
