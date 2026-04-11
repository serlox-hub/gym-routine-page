# Navigation Flow

```mermaid
flowchart LR
    classDef page fill:#1a1a2e,stroke:#BEFF00,color:#fff,stroke-width:2px
    classDef tab fill:#1a1a2e,stroke:#00D4FF,color:#fff,stroke-width:2px
    classDef modal fill:#2a2a42,stroke:#7C5CFC,color:#fff,stroke-width:1px,stroke-dasharray:5
    classDef overlay fill:#1a1a2e,stroke:#FF6B35,color:#fff,stroke-width:2px

    %% ============ TABS (entry points) ============
    HOME["🏠 Home"]:::tab
    ROUTINES["📋 Routines"]:::tab
    HISTORY["📅 History"]:::tab
    BODY["📊 Body Metrics"]:::tab

    %% ============ SHARED COMPONENTS ============
    EXERCISE_HISTORY_MODAL["ExerciseHistoryModal"]:::modal
    NEW_ROUTINE_FLOW["NewRoutineFlow"]:::modal
    WORKOUT_SESSION["Workout Session"]:::overlay
    CONFIRM_MODAL["ConfirmModal"]:::modal

    %% ============ HOME ============
    HOME --> ROUTINE_DETAIL
    HOME --> WORKOUT_SESSION
    HOME --> NEW_ROUTINE_FLOW
    HOME --> PREFERENCES["Preferences"]:::page
    PREFERENCES --> ADMIN["Admin Users"]:::page
    PREFERENCES --> CONFIRM_MODAL

    %% ============ ROUTINES ============
    ROUTINES --> ROUTINE_DETAIL
    ROUTINES --> NEW_ROUTINE_FLOW

    %% ============ NEW ROUTINE FLOW ============
    NEW_ROUTINE_FLOW --> TEMPLATES["TemplatesModal"]:::modal
    NEW_ROUTINE_FLOW --> CHATBOT["ChatbotPromptModal"]:::modal
    NEW_ROUTINE_FLOW --> ADAPT["AdaptRoutineModal"]:::modal
    NEW_ROUTINE_FLOW --> IMPORT["ImportRoutineModal"]:::modal

    %% ============ ROUTINE DETAIL ============
    ROUTINE_DETAIL["Routine Detail"]:::page
    ROUTINE_DETAIL -->|"play"| WORKOUT_SESSION
    ROUTINE_DETAIL -->|"exercise"| EXERCISE_HISTORY_MODAL
    ROUTINE_DETAIL -->|"edit"| ROUTINE_EDIT["Routine Edit Mode"]:::page
    ROUTINE_DETAIL --> CONFIRM_MODAL

    ROUTINE_EDIT --> ADD_DAY["AddDayModal"]:::modal
    ROUTINE_EDIT --> ADD_EXERCISE_MODAL["AddExerciseModal"]:::modal
    ROUTINE_EDIT --> EDIT_RE["EditRoutineExerciseModal"]:::modal
    ROUTINE_EDIT --> MOVE_DAY["MoveToDayModal"]:::modal
    ROUTINE_EDIT --> CONFIRM_MODAL
    ADD_EXERCISE_MODAL --> EXERCISE_PICKER["ExercisePickerModal"]:::modal

    %% ============ WORKOUT SESSION ============
    WORKOUT_SESSION --> END_SESSION["EndSessionModal"]:::modal
    WORKOUT_SESSION --> EDIT_SE["EditSessionExerciseModal"]:::modal
    WORKOUT_SESSION --> EXERCISE_HISTORY_MODAL
    WORKOUT_SESSION --> ADD_EX_W["AddExerciseModal · workout"]:::modal
    WORKOUT_SESSION --> WEIGHT_CONV["WeightConverterModal"]:::modal
    WORKOUT_SESSION --> CONFIRM_MODAL

    %% ============ EXERCISE HISTORY MODAL ============
    EXERCISE_HISTORY_MODAL -->|"click session"| HISTORY

    %% ============ HISTORY ============
    HISTORY --> SESSION_DETAIL["Session Inline Detail"]:::page
    SESSION_DETAIL -->|"exercise"| EXERCISE_HISTORY_MODAL
    SESSION_DETAIL --> SESSION_EDIT["Session Edit Mode"]:::page
    SESSION_DETAIL --> SUMMARY_H["WorkoutSummaryModal · share"]:::modal
    SESSION_DETAIL --> CONFIRM_MODAL

    %% ============ BODY METRICS ============
    BODY --> WEIGHT_MODAL["BodyWeightModal"]:::modal
    BODY --> MEASUREMENT["MeasurementModal"]:::modal
    BODY --> MEAS_CONFIG["MeasurementConfigModal"]:::modal

```

## Legend

| Style | Meaning |
|-------|---------|
| 🟢 Lime border | Page / Screen |
| 🔵 Cyan border | Tab (entry point) |
| 🟣 Purple dashed | Modal / Bottom Sheet |
| 🟠 Orange border | Overlay (workout session) |

## Shared Components

These are used from **multiple screens**:

| Component | Used from |
|-----------|-----------|
| **ExerciseHistoryModal** | Routine Detail, Workout Session, Session Detail |
| **NewRoutineFlow** | Home, Routines |
| **Workout Session** | Home (free), Routine Detail (play) |
| **ConfirmModal** | Routine Detail, Routine Edit, Workout Session, Session Detail, Preferences |
| **WorkoutSummaryModal** | Workout Session (end), Session Detail (share) |
| **AddExerciseModal** | Routine Edit, Workout Session |

## Stats

- **4 tabs** — Home, History, Routines, Body Metrics
- **8 pages** — Routine Detail, Preferences, Admin, Session Detail, etc.
- **23 modals** across the app
- **1 overlay** — Workout Session
