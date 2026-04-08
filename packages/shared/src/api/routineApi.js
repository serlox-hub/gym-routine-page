// Barrel re-export — sub-modules contain the implementations
// See: routineQueryApi.js, routineMutationApi.js, routineIOApi.js

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
  addExerciseToDay,
  duplicateRoutineExercise,
  moveRoutineExerciseToDay,
} from './routineMutationApi.js'

export {
  exportRoutine,
  importRoutine,
  duplicateRoutine,
} from './routineIOApi.js'
