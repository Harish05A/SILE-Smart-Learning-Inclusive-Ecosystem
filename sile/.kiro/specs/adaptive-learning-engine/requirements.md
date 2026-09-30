# Requirements Document

## Introduction

The Adaptive Learning Engine (Phase 2) already delivers a working end-to-end adaptive workflow: baseline assessment analysis, mastery scoring, rule-based topic difficulty, calibrated practice sessions, explainable recommendations, and personalized learning-path generation. This spec completes the engine by closing four integration gaps while preserving the existing behavior verified by `backend/tests/test_phase2_audit.py` (a 17-step end-to-end adaptive workflow).

The gaps are: (1) in-session real-time difficulty adjustment layered on top of the existing per-topic mastery bands, (2) prerequisite-aware and performance-driven re-sequencing of learning pathways, (3) surfacing the multi-agent scaffolding layer (worked examples and scaffolding steps) through the core adaptive practice and pathway flow, and (4) a dedicated slow-learner support capability that wires learning pace and learning preferences into pathway pacing, practice batch sizing, and scaffolding intensity.

All new behavior is additive and must not regress the passing test suite. New behavior must be covered by new automated tests.

## Glossary

- **Adaptive_Engine**: The Phase 2 backend subsystem composed of PerformanceAnalyzer, PracticeService, LearningPathGenerator, RecommendationEngine, and their supporting services in `backend/app/services/`.
- **Performance_Analyzer**: The `PerformanceAnalyzer` service that computes mastery score, mastery status, and topic difficulty from assessment and practice history.
- **Practice_Service**: The `PracticeService` service that calibrates, generates, and grades practice sessions and recalculates mastery and recommendations.
- **Path_Generator**: The `LearningPathGenerator` service that builds and updates personalized learning paths.
- **Scaffolding_Provider**: The capability that exposes worked examples and step-by-step scaffolding (currently produced by the content-adaptation agent as `worked_examples` and `scaffolding_steps`) to the core adaptive flow.
- **Slow_Learner_Support**: The capability that adjusts pathway pacing, practice batch sizing, and scaffolding intensity based on learner pace and preferences.
- **Mastery_Percentage**: A learner's topic mastery expressed on a 0–100 scale, derived from the existing mastery score.
- **Session_Difficulty**: The difficulty level (BEGINNER, DEVELOPING, PROFICIENT, ADVANCED) applied to questions within an active practice session.
- **Learning_Pace**: The learner's `LearningPace` enum value on the learner profile (SLOW, MODERATE, FAST).
- **Learning_Preference**: The `LearningPreference` record holding flags `visual_explanations`, `step_by_step`, `simplified_language`, `audio_support`, `interactive_learning`, `short_sessions`.
- **Practice_Batch_Size**: The number of questions issued in a single practice session.
- **Learning_Path_Item**: A `LearningPathItem` record with a `sequence_number` and a `PathItemStatus`.
- **Prerequisite_Topic**: A topic referenced by another topic's `prerequisite_topic` relationship that should be addressed earlier in a pathway.
- **Audit_Test_Suite**: The existing automated tests, primarily `backend/tests/test_phase2_audit.py`.

## Requirements

### Requirement 1: In-session real-time difficulty adjustment

**User Story:** As a learner, I want practice difficulty to adjust in real time based on how I answer within a session, so that questions stay appropriately challenging without waiting for a full mastery recalculation.

#### Acceptance Criteria

1. WHEN a practice session is generated, THE Practice_Service SHALL set the initial Session_Difficulty using Performance_Analyzer.determine_topic_difficulty mastery-band calibration.
2. WHEN the learner answers a configured number of consecutive questions correctly (default 3, configurable in range 1–10), THE Practice_Service SHALL raise the Session_Difficulty by one level for the next question served and reset the consecutive-correct counter.
3. WHEN the learner answers a configured number of consecutive questions incorrectly (default 3, configurable in range 1–10), THE Practice_Service SHALL lower the Session_Difficulty by one level for the next question served and reset the consecutive-incorrect counter.
4. IF Session_Difficulty is already ADVANCED when a raise would occur, THEN THE Practice_Service SHALL keep Session_Difficulty at ADVANCED and reset the consecutive-correct counter.
5. IF Session_Difficulty is already BEGINNER when a lower would occur, THEN THE Practice_Service SHALL keep Session_Difficulty at BEGINNER and reset the consecutive-incorrect counter.
6. WHEN a practice session is submitted, THE Practice_Service SHALL record the final Session_Difficulty and the ordered list of difficulty adjustments that occurred during the session in the practice result.
7. THE Practice_Service SHALL constrain Session_Difficulty to the ordered set {BEGINNER, DEVELOPING, PROFICIENT, ADVANCED}.
8. WHERE spaced-repetition scheduling is enabled for a topic, THE Adaptive_Engine SHALL surface topics whose last attempt is older than a configured interval (default 3 days, configurable in range 1–90 days), ordered oldest-last-attempt first, for earlier review.

### Requirement 2: Prerequisite-aware and performance-driven pathway sequencing

**User Story:** As a learner, I want my learning path ordered by prerequisites and re-sequenced when my performance changes, so that I always work on the right topic in the right order.

#### Acceptance Criteria

1. WHEN a learning path is generated, THE Path_Generator SHALL order Learning_Path_Items so that every Prerequisite_Topic appears at a lower position index than each topic that declares it as a prerequisite.
2. IF a topic and its Prerequisite_Topic form a cyclic dependency such that no valid prerequisite ordering exists, THEN THE Path_Generator SHALL order the affected Learning_Path_Items by ascending topic `order_number`, complete generation without aborting, and record an indication that a cyclic dependency was detected.
3. WHEN a practice submission changes a topic's Mastery_Percentage, THE Adaptive_Engine SHALL recalculate the active learning path sequence within 3 seconds of the submission being recorded and SHALL determine whether the current ordering still reflects the learner's mastery gaps.
4. IF the recalculation in criterion 3 determines that the active learning path ordering no longer reflects current mastery gaps, THEN THE Adaptive_Engine SHALL trigger a re-sequence of the active learning path.
5. WHEN a re-sequence is triggered by a mastery change, THE Path_Generator SHALL reorder only Learning_Path_Items whose status is PENDING.
6. WHEN a re-sequence is triggered by a mastery change, THE Path_Generator SHALL preserve the position and status of every Learning_Path_Item whose status is COMPLETED, IN_PROGRESS, or SKIPPED.
7. WHILE a re-sequence is in progress, THE Path_Generator SHALL keep the total Learning_Path_Item count within the inclusive range of 5 to 10 items.
8. IF a re-sequence would reduce the total Learning_Path_Item count below 5 or increase it above 10, THEN THE Path_Generator SHALL reject the re-sequence, retain the pre-re-sequence ordering, and record an indication that the count constraint was violated.

### Requirement 3: Adaptive scaffolding surfaced through the core engine

**User Story:** As a learner, I want worked examples and step-by-step guidance available directly in my practice and pathway flow, so that I get scaffolded help without leaving the adaptive engine.

#### Acceptance Criteria

1. WHEN a practice session is generated, THE Scaffolding_Provider SHALL attach to the practice session response, for the practice topic, at least 1 and at most 5 worked examples and at least 1 and at most 10 ordered scaffolding steps.
2. WHEN a learning path item is presented, THE Scaffolding_Provider SHALL include the scaffolding steps for the item's topic within that item's response, using the same ordered-step structure as the practice session response.
3. WHERE a Prerequisite_Topic gap exists for the current topic (defined as a Prerequisite_Topic that the learner has not completed), THE Scaffolding_Provider SHALL include exactly one prerequisite-review scaffolding step positioned before the current topic's own scaffolding steps in the ordered step sequence.
4. IF scaffolding content is unavailable from the content-adaptation layer, THEN THE Scaffolding_Provider SHALL return a fixed fallback set of at least 1 and at most 10 ordered scaffolding steps that is identical for repeated requests with the same topic, include an indicator marking the steps as fallback content, and SHALL NOT return an error response.
5. WHEN a practice or pathway response is returned with scaffolding, THE Scaffolding_Provider SHALL return all practice and pathway response fields that were present before scaffolding was added with unchanged values, and SHALL provide the scaffolding content only in additional fields.

### Requirement 4: Slow-learner support

**User Story:** As a slow-paced learner, I want the engine to pace my path, size my practice, and intensify scaffolding to match my needs, so that I can learn without being overwhelmed.

#### Acceptance Criteria

1. WHERE the learner's Learning_Pace is SLOW, THE Slow_Learner_Support SHALL set the Practice_Batch_Size to 50% of the default batch size, rounded down, with a minimum of 3 questions.
2. WHERE the learner's Learning_Pace is SLOW, THE Path_Generator SHALL cap the number of new Learning_Path_Items introduced per topic at 1.
3. WHERE the Learning_Preference `step_by_step` flag is true, THE Slow_Learner_Support SHALL include the full set of available scaffolding steps for each presented item.
4. WHERE the Learning_Preference `simplified_language` flag is true, THE Slow_Learner_Support SHALL request simplified-language scaffolding from the Scaffolding_Provider.
5. WHERE the Learning_Preference `short_sessions` flag is true, THE Path_Generator SHALL select, among candidate Learning_Path_Items of equal priority, the item with the smallest `estimated_duration_minutes`.
6. IF the learner's Learning_Pace or Learning_Preference data cannot be resolved, THEN THE Adaptive_Engine SHALL apply the default pacing, batch sizing, and scaffolding behavior and record an indication that a fallback to defaults occurred.
7. WHERE the learner's Learning_Pace is MODERATE or FAST and no slow-support preference flags are set, THE Adaptive_Engine SHALL apply the default pacing, batch sizing, and scaffolding behavior.

### Requirement 5: Regression protection and test coverage

**User Story:** As a maintainer, I want the existing adaptive workflow to keep passing and the new behavior to be tested, so that completing the engine does not break shipped functionality.

#### Acceptance Criteria

1. WHEN the Audit_Test_Suite is executed after the new behavior is implemented, THE Adaptive_Engine SHALL pass 100% of the assertions in `backend/tests/test_phase2_audit.py` (zero failures, zero errors) without modification to that test's expectations, completing within 120 seconds.
2. THE Adaptive_Engine SHALL retain the existing public response fields consumed by the Audit_Test_Suite, including `recommended_next_action`, `reviews`, `progress_percentage`, and learning-path `status` values, such that each field is present with the same name and value type as before the new behavior was implemented.
3. IF any assertion in `backend/tests/test_phase2_audit.py` fails or errors during a run of the Audit_Test_Suite, THEN THE Audit_Test_Suite SHALL report a non-passing result identifying each failed assertion, and the run SHALL be treated as a regression failure.
4. THE Audit_Test_Suite SHALL include a test asserting that Session_Difficulty increases by exactly one step after the configured number of consecutive correct answers and decreases by exactly one step after the configured number of consecutive incorrect answers, bounded by BEGINNER and ADVANCED.
5. THE Audit_Test_Suite SHALL include a test asserting that, for a given learning path, every Prerequisite_Topic item appears at an earlier sequence position than each of its dependent topic items.
6. THE Audit_Test_Suite SHALL include a test asserting that a learner whose Learning_Pace is SLOW receives a Practice_Batch_Size strictly smaller than the Practice_Batch_Size assigned to an otherwise-identical learner whose Learning_Pace is not SLOW.
7. THE Audit_Test_Suite SHALL include a test asserting that, when scaffolding is surfaced, the practice session response contains one or more scaffolding steps.
