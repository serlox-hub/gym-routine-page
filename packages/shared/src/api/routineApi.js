// Barrel re-export — sub-modules contain the implementations
// See: routineQueryApi.js, routineMutationApi.js, routineIOApi.js, routineShareApi.js

export {
  fetchRoutines,
  fetchRoutine,
  fetchRoutineDays,
  fetchRoutineDay,
  fetchRoutineDayExercises,
  fetchRoutineBlocks,
  fetchRoutineAllExercises,
} from './routineQueryApi.js'

export {
  createRoutine,
  createRoutineDay,
  updateRoutine,
  deleteRoutine,
  deleteRoutines,
  setFavoriteRoutine,
  updateRoutineDay,
  deleteRoutineDay,
  reorderRoutineDays,
  deleteRoutineExercise,
  updateRoutineExercise,
  reorderRoutineExercises,
  setRoutineExerciseSupersetGroup,
  addExerciseToDay,
  duplicateRoutineExercise,
  duplicateRoutineDay,
  createRoutineDayWithExercises,
  moveRoutineExerciseToDay,
} from './routineMutationApi.js'

export {
  buildRoutineExport,
  exportRoutine,
  importRoutine,
  duplicateRoutine,
} from './routineIOApi.js'

export {
  SharedRoutineNotFoundError,
  enableRoutineShare,
  disableRoutineShare,
  fetchSharedRoutine,
  importSharedRoutine,
} from './routineShareApi.js'
