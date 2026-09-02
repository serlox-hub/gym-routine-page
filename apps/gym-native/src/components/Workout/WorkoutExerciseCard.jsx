import { memo, useState, useEffect, useRef, useMemo } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Info, Trash2, ArrowUpDown, Repeat2, Pencil } from 'lucide-react-native'
import { Card, ConfirmModal, ReorderModal } from '../ui'
import ExerciseHistoryModal from './ExerciseHistoryModal'
import { ExercisePickerModal } from '../Routine'
import ExerciseCardHeader from './ExerciseCardHeader'
import ExerciseCardNotes from './ExerciseCardNotes'
import NotesToggleBar from './NotesToggleBar'
import EditSessionExerciseModal from './EditSessionExerciseModal'
import SetsList from './SetsList'
import useWorkoutStore from '../../stores/workoutStore'
import { usePreviousWorkout, useUpdateSessionExerciseFields } from '../../hooks/useWorkout'
import { useUserExerciseOverride } from '../../hooks/useExercises'
import { getHaptics, getExerciseName, usePreference, useResolvedWeightUnit, hasExerciseNotes, useExpandedExercise, useLazyMountToggle, resolveTrackedFields } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles'

function WorkoutExerciseCard({ sessionExercise, onCompleteSet, onUncompleteSet, onRemove, onReplace, isSuperset = false, onReorder, currentIndex = 0, totalExercises = 1, positionLabels = [], isReordering = false, existingSupersets = [] }) {
  const { t } = useTranslation()
  const { id, sessionExerciseId, exercise, series, reps, target_field, level, rir, notes, rest_seconds } = sessionExercise
  const [showHistory, setShowHistory] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [showReorder, setShowReorder] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const updateFieldsMutation = useUpdateSessionExerciseFields()
  const gymId = useWorkoutStore(state => state.gymId)
  const { data: override } = useUserExerciseOverride(exercise?.id)
  const { value: progressionEnabled } = usePreference('progression_suggestions')
  // useMemo, NO llamada directa: devuelve un array NUEVO en cada render y esta prop viaja a
  // `memo(SetRow)` y a las deps del commit con debounce de `useSetInputs`. Sin memo se
  // re-renderizan todas las filas y el timer de guardado se rearma sin parar. `exercise` viene de
  // la caché de query, así que su referencia es estable entre renders.
  const trackedFields = useMemo(() => resolveTrackedFields(exercise), [exercise])
  const weightUnit = useResolvedWeightUnit(exercise?.id, gymId)
  const exerciseKey = sessionExerciseId || id

  const { expanded, toggle: toggleExpanded } = useExpandedExercise(exerciseKey)
  const collapsed = !expanded
  const routineDayId = useWorkoutStore(state => state.routineDayId)
  const sessionId = useWorkoutStore(state => state.sessionId)
  // Número de filas = series configuradas en la rutina (session_exercises.series).
  // El usuario puede añadir/quitar filas manualmente (queda en exerciseSetCounts).
  const setsCount = useWorkoutStore(state => state.exerciseSetCounts[exerciseKey] ?? series)
  const setExerciseSetCount = useWorkoutStore(state => state.setExerciseSetCount)
  const completedCount = useWorkoutStore(state => { let c = 0; for (const k in state.completedSets) { if (k.startsWith(`${exerciseKey}-`)) c++ } return c })

  // Notas montadas perezosamente y ocultadas (no desmontadas) al cerrar, para no
  // re-pedir el GIF que contienen al alternarlas; se olvida la apertura al colapsar.
  // Arrancan CERRADAS: abrirlas solas empuja la cabecera del ejercicio fuera de pantalla
  // (~400-500px de GIF + instrucciones por delante de la primera serie). Lo que se arregla es la
  // barra, que ahora dice lo que esconde. Ver NotesToggleBar y docs/DECISIONS.md.
  const { open: showNotes, mounted: notesMounted, toggle: toggleNotes } = useLazyMountToggle(collapsed)
  // `isFetched` es true tras resolverse la query, con dato O con error (dataUpdateCount o
  // errorUpdateCount > 0). Es lo que hace falta para sembrar el nivel prescrito: con la referencia
  // caída seguimos dando la pista que sí tenemos, en vez de dejar la columna vacía para siempre.
  const { data: previousWorkout, isFetched: previousFetched } = usePreviousWorkout(exercise.id, { gymId, routineDayId, sessionId })

  const addSet = () => setExerciseSetCount(exerciseKey, setsCount + 1)
  const removeSet = () => { if (setsCount > 0) setExerciseSetCount(exerciseKey, setsCount - 1) }
  const handleSaveEdit = (sessionExerciseId, fields, newSeries) => {
    updateFieldsMutation.mutate({ sessionExerciseId, fields })
    if (newSeries && newSeries !== setsCount) setExerciseSetCount(exerciseKey, newSeries)
  }
  const isCompleted = completedCount === setsCount && setsCount > 0
  const prevCompletedRef = useRef(isCompleted)

  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current) {
      getHaptics()?.onExerciseComplete?.()
    }
    prevCompletedRef.current = isCompleted
  }, [isCompleted])

  const menuItems = [
    { label: t('workout:history.title'), icon: Info, onPress: () => setShowHistory(true) },
    { label: t('common:buttons.edit'), icon: Pencil, onPress: () => setShowEdit(true) },
    onReplace && { label: t('routine:exercise.replace'), icon: Repeat2, onPress: () => setShowReplace(true) },
    onReorder && totalExercises > 1 && { label: t('routine:reorder'), icon: ArrowUpDown, onPress: () => setShowReorder(true), disabled: isReordering },
    onRemove && { label: t('workout:exercise.removeFromSession'), icon: Trash2, onPress: () => setShowRemoveConfirm(true), danger: true },
  ].filter(Boolean)

  const cardStyle = getMuscleGroupBorderStyle(exercise.muscle_group?.name)

  const hasNotes = hasExerciseNotes(exercise, override, notes)

  const content = (
    <>
      <ExerciseCardHeader
        exerciseName={getExerciseName(exercise)}
        muscleGroup={exercise.muscle_group}
        series={series} reps={reps} level={level} rir={rir} trackedFields={trackedFields} rest_seconds={rest_seconds}
        collapsed={collapsed}
        isCompleted={isCompleted}
        onToggleCollapse={toggleExpanded}
        menuItems={menuItems}
      />
      {!collapsed && (
        <>
          {hasNotes && (
            <View style={{ marginTop: 18 }}>
              <NotesToggleBar showNotes={showNotes} onToggle={toggleNotes} />
            </View>
          )}
          {notesMounted && (
            <View style={{ display: showNotes ? 'flex' : 'none' }}>
              <ExerciseCardNotes exercise={exercise} notes={notes} />
            </View>
          )}
          <SetsList exerciseKey={exerciseKey} exercise={exercise} setsCount={setsCount} previousWorkout={previousWorkout} previousLoaded={previousFetched} progressionEnabled={progressionEnabled} trackedFields={trackedFields} weightUnit={weightUnit} rest_seconds={rest_seconds} reps={reps} targetField={target_field} levelTarget={level} effortTarget={rir} onCompleteSet={onCompleteSet} onUncompleteSet={onUncompleteSet} onRemoveSet={removeSet} onAddSet={addSet} />
        </>
      )}
      <ExerciseHistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} exerciseId={exercise.id} exerciseName={getExerciseName(exercise)} trackedFields={trackedFields} routineDayId={routineDayId} />
      <ConfirmModal isOpen={showRemoveConfirm} title={t('workout:exercise.removeFromSession')} message={t('workout:exercise.removeFromSessionConfirm', { name: getExerciseName(exercise) })} confirmText={t('common:buttons.delete')} onConfirm={() => { setShowRemoveConfirm(false); onRemove(exerciseKey) }} onCancel={() => setShowRemoveConfirm(false)} />
      <ExercisePickerModal isOpen={showReplace} onClose={() => setShowReplace(false)} title={t('routine:exercise.replace')} subtitle={`${t('routine:exercise.replacing')}: ${getExerciseName(exercise)}`} initialMuscleGroup={exercise.muscle_group?.id} onSelect={(newExercise) => { setShowReplace(false); onReplace(exerciseKey, newExercise.id) }} />
      {showReorder && <ReorderModal visible onClose={() => setShowReorder(false)} totalItems={totalExercises} currentIndex={currentIndex} positionLabels={positionLabels} onSelect={(i) => { onReorder(currentIndex, i); setShowReorder(false) }} />}
      <EditSessionExerciseModal isOpen={showEdit} onClose={() => setShowEdit(false)} onSave={handleSaveEdit} sessionExercise={sessionExercise} existingSupersets={existingSupersets} />
    </>
  )

  if (isSuperset) return <View>{content}</View>
  // Expandida: MÁS aire, pero solo en vertical. El padding horizontal se queda en 16px a
  // propósito — es una de las restas de la aritmética de anchos de `MAX_TRACKED_FIELDS`, y
  // subirlo dejaría los inputs de un cardio de 3 campos por debajo de su mínimo legible.
  // El mismo valor lo repite `SupersetCard` en su envoltorio por ejercicio.
  return <Card className={collapsed ? 'px-4 py-2.5' : 'px-4 py-5'} style={cardStyle}>{content}</Card>
}

export default memo(WorkoutExerciseCard)
