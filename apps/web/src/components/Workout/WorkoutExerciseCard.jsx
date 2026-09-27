import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info, Trash2, ArrowUpDown, Repeat2, Pencil, Link2Off } from 'lucide-react'
import { Card, ConfirmModal } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import ExerciseHistoryModal from './ExerciseHistoryModal.jsx'
import ExercisePickerModal from '../Routine/ExercisePickerModal.jsx'
import EditSessionExerciseModal from './EditSessionExerciseModal.jsx'
import ExerciseCardHeader from './ExerciseCardHeader.jsx'
import ExerciseCardNotes from './ExerciseCardNotes.jsx'
import NotesToggleBar from './NotesToggleBar.jsx'
import SetsList from './SetsList.jsx'
import useWorkoutStore from '../../stores/workoutStore.js'
import { usePreviousWorkout, useUpdateSessionExerciseFields } from '../../hooks/useWorkout.js'
import { useUserExerciseOverride } from '../../hooks/useExercises.js'
import { getExerciseName, usePreference, useResolvedWeightUnit, hasExerciseNotes, useExpandedExercise, useLazyMountToggle, useResolvedDistanceUnit, resolveTrackedFields, canApplyToRoutine } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'

function WorkoutExerciseCard({ sessionExercise, onCompleteSet, onUncompleteSet, onRemove, onReplace, isSuperset = false, reorder, isReordering = false, onRemoveFromSuperset, dragHandleProps = null, isDragging = false, existingSupersets = [] }) {
  const { t } = useTranslation()
  const { id, sessionExerciseId, exercise, series, reps, target_field, level, rir, notes, rest_seconds } = sessionExercise
  const [showHistory, setShowHistory] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  // Ejercicio elegido para sustituir, a la espera de "solo hoy" / "también en la rutina".
  const [pendingReplacement, setPendingReplacement] = useState(null)
  const [showEdit, setShowEdit] = useState(false)

  const gymId = useWorkoutStore(state => state.gymId)
  const { data: override } = useUserExerciseOverride(exercise?.id)
  const { value: progressionEnabled } = usePreference('progression_suggestions')
  // useMemo, NO llamada directa: devuelve un array NUEVO en cada render y esta prop viaja a
  // `memo(SetRow)` y a las deps del commit con debounce de `useSetInputs`. Sin memo se
  // re-renderizan todas las filas y el timer de guardado se rearma sin parar. `exercise` viene de
  // la caché de query, así que su referencia es estable entre renders.
  const trackedFields = useMemo(() => resolveTrackedFields(exercise), [exercise])
  const weightUnit = useResolvedWeightUnit(exercise?.id, gymId)
  const distanceUnit = useResolvedDistanceUnit(exercise)
  const exerciseKey = sessionExerciseId || id

  const { expanded, toggle: toggleExpanded } = useExpandedExercise(exerciseKey)
  const collapsed = !expanded
  const completedSets = useWorkoutStore(state => state.completedSets)
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const sessionId = useWorkoutStore(state => state.sessionId)
  const exerciseSetCounts = useWorkoutStore(state => state.exerciseSetCounts)
  const setExerciseSetCount = useWorkoutStore(state => state.setExerciseSetCount)
  // `isFetched` es true tras resolverse la query, con dato O con error (dataUpdateCount o
  // errorUpdateCount > 0). Es lo que hace falta para sembrar el nivel prescrito: con la referencia
  // caída seguimos dando la pista que sí tenemos, en vez de dejar la columna vacía para siempre.
  const { data: previousWorkout, isFetched: previousFetched } = usePreviousWorkout(exercise.id, { gymId, routineDayId, sessionId })
  // Número de filas = series configuradas en la rutina (session_exercises.series).
  // El usuario puede añadir/quitar filas manualmente (queda en exerciseSetCounts).
  const setsCount = exerciseSetCounts[exerciseKey] ?? series

  const completedCount = useMemo(() => Object.values(completedSets).filter(set => set.sessionExerciseId === exerciseKey).length, [completedSets, exerciseKey])
  const isCompleted = completedCount === setsCount && setsCount > 0

  // Notas montadas perezosamente y ocultadas (no desmontadas) al cerrar, para no
  // re-pedir el GIF que contienen al alternarlas; se olvida la apertura al colapsar.
  // Arrancan CERRADAS: abrirlas solas empuja la cabecera del ejercicio fuera de pantalla
  // (~400-500px de GIF + instrucciones por delante de la primera serie). Lo que se arregla es la
  // barra, que ahora dice lo que esconde. Ver NotesToggleBar y docs/DECISIONS.md.
  const { open: showNotes, mounted: notesMounted, toggle: toggleNotes } = useLazyMountToggle(collapsed)

  const updateFieldsMutation = useUpdateSessionExerciseFields()
  const addSet = () => setExerciseSetCount(exerciseKey, setsCount + 1)
  const removeSet = () => { if (setsCount > 0) setExerciseSetCount(exerciseKey, setsCount - 1) }
  const handleSaveEdit = (sessionExerciseId, fields, newSeries) => {
    updateFieldsMutation.mutate({ sessionExerciseId, fields })
    if (newSeries && newSeries !== setsCount) setExerciseSetCount(exerciseKey, newSeries)
  }

  // Sin fila de rutina (extra, o su fila se borró) no hay nada que preguntar: solo la sesión.
  // Cerrar el diálogo aborta: el reemplazo borra las series hechas y no se puede deshacer.
  const handlePickReplacement = (newExercise) => {
    setShowReplace(false)
    if (canApplyToRoutine(sessionExercise)) setPendingReplacement(newExercise)
    else onReplace(exerciseKey, newExercise, false)
  }
  const confirmReplacement = (applyToRoutine) => {
    onReplace(exerciseKey, pendingReplacement, applyToRoutine)
    setPendingReplacement(null)
  }

  const menuItems = [
    { label: t('workout:history.title'), icon: Info, onClick: () => setShowHistory(true) },
    { label: t('common:buttons.edit'), icon: Pencil, onClick: () => setShowEdit(true) },
    onReplace && { label: t('routine:exercise.replace'), icon: Repeat2, onClick: () => setShowReplace(true) },
    // Solo las posiciones de SU ámbito (su tirada o las unidades del bloque): el menú nunca parte
    // una superserie. Ver `ExerciseRowList`.
    reorder && reorder.labels.length > 1 && {
      icon: ArrowUpDown, label: t('routine:reorder'), disabled: isReordering,
      children: reorder.labels.map((label, i) => ({
        label: `${i + 1}. ${label || ''}`, onClick: () => reorder.onReorderTo(i),
        active: i === reorder.index, disabled: i === reorder.index || isReordering,
      })),
    },
    onRemoveFromSuperset && { label: t('routine:superset.removeFrom'), icon: Link2Off, onClick: onRemoveFromSuperset, disabled: isReordering },
    onRemove && { label: t('workout:exercise.removeFromSession'), icon: Trash2, onClick: () => setShowRemoveConfirm(true), danger: true },
  ]

  const Wrapper = isSuperset ? 'div' : Card
  const wrapperProps = isSuperset
    ? {}
    : {
        // Expandida: MÁS aire, pero solo en vertical. El padding horizontal se queda en 16px a
        // propósito — es una de las restas de la aritmética de anchos de `MAX_TRACKED_FIELDS`, y
        // subirlo dejaría los inputs de un cardio de 3 campos por debajo de su mínimo legible.
        // El mismo valor lo repite `BlockExerciseList` en su envoltorio por miembro de superserie.
        className: collapsed ? 'px-4 py-2.5' : 'px-4 py-5',
        style: {
          ...getMuscleGroupBorderStyle(exercise.muscle_group?.name),
          boxShadow: isDragging ? `0 8px 24px ${colors.shadow}` : undefined,
        },
      }

  const hasNotes = hasExerciseNotes(exercise, override, notes)

  return (
    <Wrapper {...wrapperProps}>
      <ExerciseCardHeader
        exerciseName={getExerciseName(exercise)}
        muscleGroup={exercise.muscle_group}
        series={series} reps={reps} level={level} rir={rir} trackedFields={trackedFields} rest_seconds={rest_seconds}
        collapsed={collapsed}
        isCompleted={isCompleted}
        onToggleCollapse={toggleExpanded}
        menuItems={menuItems}
        dragHandleProps={dragHandleProps}
        isReordering={isReordering}
      />
      {!collapsed && (
        <>
          {hasNotes && (
            <div style={{ marginTop: 18 }}>
              <NotesToggleBar showNotes={showNotes} onToggle={toggleNotes} />
            </div>
          )}
          {notesMounted && (
            <div style={{ display: showNotes ? undefined : 'none' }}>
              <ExerciseCardNotes exercise={exercise} notes={notes} />
            </div>
          )}
          <SetsList exerciseKey={exerciseKey} exercise={exercise} setsCount={setsCount} previousWorkout={previousWorkout} previousLoaded={previousFetched} progressionEnabled={progressionEnabled} trackedFields={trackedFields} weightUnit={weightUnit} distanceUnit={distanceUnit} rest_seconds={rest_seconds} reps={reps} targetField={target_field} levelTarget={level} effortTarget={rir} onCompleteSet={onCompleteSet} onUncompleteSet={onUncompleteSet} onRemoveSet={removeSet} onAddSet={addSet} />
        </>
      )}
      <ExerciseHistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} exerciseId={exercise.id} exerciseName={getExerciseName(exercise)} trackedFields={trackedFields} distanceUnit={distanceUnit} routineDayId={routineDayId} />
      <ExercisePickerModal isOpen={showReplace} onClose={() => setShowReplace(false)} title={t('routine:exercise.replace')} subtitle={`${t('routine:exercise.replacing')}: ${getExerciseName(exercise)}`} initialMuscleGroup={exercise.muscle_group?.id} onSelect={handlePickReplacement} />
      <ConfirmModal isOpen={!!pendingReplacement} title={t('workout:exercise.replaceScopeTitle')} message={t('workout:exercise.replaceScopeMessage', { name: getExerciseName(exercise) })} cancelText={t('workout:exercise.replaceOnlyToday')} confirmText={t('workout:exercise.replaceAlsoRoutine')} variant="primary" onCancel={() => confirmReplacement(false)} onConfirm={() => confirmReplacement(true)} onDismiss={() => setPendingReplacement(null)} />
      <ConfirmModal isOpen={showRemoveConfirm} title={t('workout:exercise.removeFromSession')} message={t('workout:exercise.removeFromSessionConfirm', { name: getExerciseName(exercise) })} confirmText={t('common:buttons.delete')} onConfirm={() => { setShowRemoveConfirm(false); onRemove(exerciseKey) }} onCancel={() => setShowRemoveConfirm(false)} />
      <EditSessionExerciseModal isOpen={showEdit} onClose={() => setShowEdit(false)} onSave={handleSaveEdit} sessionExercise={sessionExercise} existingSupersets={existingSupersets} />
    </Wrapper>
  )
}

export default WorkoutExerciseCard
