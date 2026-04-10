import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Pin, Repeat, Layers } from 'lucide-react'
import { useRoutine, useRoutineDays, useRoutineAllExercises, useCreateRoutineDay, useDeleteRoutine, useAddExerciseToDay, useDeleteRoutineDay, useReorderRoutineDays, useUpdateRoutineExercise, useDuplicateRoutineExercise, useMoveRoutineExerciseToDay, useSetFavoriteRoutine } from '../hooks/useRoutines.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal } from '../components/ui/index.js'
import { DayCard, AddDayModal, AddExerciseModal, EditRoutineExerciseModal, RoutineHeader, RoutineEditForm, MoveToDayModal, VolumeSummary } from '../components/Routine/index.js'
import { moveItemToPosition } from '@gym/shared'
import useWorkoutStore from '../stores/workoutStore.js'
import { colors } from '../lib/styles.js'

function RoutineDetail() {
  const { routineId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const isEditing = location.pathname.endsWith('/edit')
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeRoutineDayId = useWorkoutStore(state => state.routineDayId)
  const [showAddDay, setShowAddDay] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState(null)
  const [isAddingWarmup, setIsAddingWarmup] = useState(false)
  const [showEditExercise, setShowEditExercise] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [dayToDelete, setDayToDelete] = useState(null)
  const [existingSupersets, setExistingSupersets] = useState([])
  const [isReplacing, setIsReplacing] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [exerciseToMove, setExerciseToMove] = useState(null)
  const [movingFromDayId, setMovingFromDayId] = useState(null)
  const [descExpanded, setDescExpanded] = useState(false)

  const { data: routine, isLoading: loadingRoutine, error: routineError } = useRoutine(routineId)
  const { data: days, isLoading: loadingDays, error: daysError } = useRoutineDays(routineId)
  const { data: allRoutineExercises } = useRoutineAllExercises(routineId)
  const createDay = useCreateRoutineDay()
  const deleteRoutine = useDeleteRoutine()
  const addExercise = useAddExerciseToDay()
  const updateExercise = useUpdateRoutineExercise()
  const deleteDay = useDeleteRoutineDay()
  const reorderDays = useReorderRoutineDays()
  const duplicateExercise = useDuplicateRoutineExercise()
  const moveExercise = useMoveRoutineExerciseToDay()
  const setFavoriteMutation = useSetFavoriteRoutine()

  const isLoading = loadingRoutine || loadingDays
  const error = routineError || daysError

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const maxDayNumber = days?.reduce((max, day) => Math.max(max, day.sort_order), 0) || 0
  const nextDayNumber = maxDayNumber + 1

  const handleAddDay = async (day) => {
    try {
      await createDay.mutateAsync({ routineId: parseInt(routineId), day })
      setShowAddDay(false)
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleDeleteRoutine = async () => {
    try {
      await deleteRoutine.mutateAsync(parseInt(routineId))
      navigate('/')
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleOpenAddExercise = (dayId, supersets = []) => {
    setSelectedDayId(dayId)
    setIsAddingWarmup(false)
    setExistingSupersets(supersets)
    setShowAddExercise(true)
  }

  const handleOpenAddWarmup = (dayId, supersets = []) => {
    setSelectedDayId(dayId)
    setIsAddingWarmup(true)
    setExistingSupersets(supersets)
    setShowAddExercise(true)
  }

  const handleAddExercise = async ({ exerciseId, series, reps, rir, rest_seconds, notes, superset_group }) => {
    try {
      await addExercise.mutateAsync({
        dayId: selectedDayId,
        exerciseId,
        series,
        reps,
        rir,
        rest_seconds,
        notes,
        esCalentamiento: isAddingWarmup,
        superset_group,
      })
      setShowAddExercise(false)
      setSelectedDayId(null)
      setIsAddingWarmup(false)
      setExistingSupersets([])
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleOpenEditExercise = (routineExercise, dayId, supersets = []) => {
    setSelectedExercise(routineExercise)
    setSelectedDayId(dayId)
    setExistingSupersets(supersets)
    setIsReplacing(false)
    setShowEditExercise(true)
  }

  const handleOpenReplaceExercise = (routineExercise, dayId) => {
    setSelectedExercise(routineExercise)
    setSelectedDayId(dayId)
    setIsReplacing(true)
    setShowEditExercise(true)
  }

  const handleEditExercise = async ({ exerciseId, series, reps, rir, rest_seconds, notes, superset_group, exercise_id }) => {
    try {
      const data = { series, reps, rir, rest_seconds, notes, superset_group }
      if (exercise_id) data.exercise_id = exercise_id
      await updateExercise.mutateAsync({
        exerciseId,
        dayId: selectedDayId,
        data,
      })
      setShowEditExercise(false)
      setSelectedExercise(null)
      setSelectedDayId(null)
      setIsReplacing(false)
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleDeleteDay = async () => {
    if (!dayToDelete) return
    try {
      await deleteDay.mutateAsync({ dayId: dayToDelete.id, routineId })
      setDayToDelete(null)
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleReorderDay = async (dayId, newIndex) => {
    if (!days) return

    const newDays = moveItemToPosition(days, dayId, newIndex)
    if (!newDays) return

    try {
      await reorderDays.mutateAsync({ routineId, days: newDays })
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleDuplicateExercise = async (routineExercise, dayId) => {
    try {
      await duplicateExercise.mutateAsync({ routineExercise, dayId })
    } catch {
      // Error handled by TanStack Query
    }
  }

  const handleOpenMoveModal = (routineExercise, dayId) => {
    setExerciseToMove(routineExercise)
    setMovingFromDayId(dayId)
    setShowMoveModal(true)
  }

  const handleMoveExerciseToDay = async (targetDayId) => {
    if (!exerciseToMove || !movingFromDayId) return
    try {
      await moveExercise.mutateAsync({
        routineExercise: exerciseToMove,
        sourceDayId: movingFromDayId,
        targetDayId,
      })
      setShowMoveModal(false)
      setExerciseToMove(null)
      setMovingFromDayId(null)
    } catch {
      // Error handled by TanStack Query
    }
  }

  const exerciseCount = allRoutineExercises?.length || 0
  const daysCount = days?.length || 0
  const descNeedsTruncation = routine?.description && routine.description.length > 100

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <RoutineHeader
        routine={routine}
        routineId={routineId}
        isEditing={isEditing}
        onEditStart={() => navigate(`/routine/${routineId}/edit`)}
        onEditEnd={() => navigate(`/routine/${routineId}`)}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {/* Info Section (view mode) */}
      {!isEditing && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          <h2 style={{ color: colors.textPrimary, fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
            {routine?.name}
          </h2>
          {routine?.description && (
            <div>
              <p style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.4 }}
                className={descExpanded ? '' : 'line-clamp-2'}
              >
                {routine.description}
              </p>
              {descNeedsTruncation && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  style={{ color: colors.success, fontSize: 13, fontWeight: 500, marginTop: 2 }}
                >
                  {descExpanded ? t('common:buttons.seeLess') : t('common:buttons.seeMore')}
                </button>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1"
              style={{ backgroundColor: colors.bgAlt, borderRadius: 8, padding: '5px 10px', color: colors.textSecondary, fontSize: 11, fontWeight: 500 }}>
              <Repeat size={12} />
              {t('common:home.nDays', { count: daysCount })}
            </span>
            <span className="inline-flex items-center gap-1"
              style={{ backgroundColor: colors.bgAlt, borderRadius: 8, padding: '5px 10px', color: colors.textSecondary, fontSize: 11, fontWeight: 500 }}>
              <Layers size={12} />
              {t('common:home.nExercises', { count: exerciseCount })}
            </span>
          </div>
        </section>
      )}

      {/* Pin toggle (view mode) */}
      {!isEditing && (
        <div
          className="flex items-center justify-between cursor-pointer"
          style={{
            backgroundColor: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 24,
          }}
          onClick={() => setFavoriteMutation.mutate({ routineId: parseInt(routineId), isFavorite: !routine?.is_favorite })}
        >
          <div className="flex items-center gap-2.5">
            <Pin size={18} style={{ color: colors.success }} />
            <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>
              {t('common:home.pinnedToHome')}
            </span>
          </div>
          <div
            style={{
              width: 44, height: 26, borderRadius: 13,
              backgroundColor: routine?.is_favorite ? colors.success : colors.bgAlt,
              position: 'relative', transition: 'background-color 0.2s',
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 11,
              backgroundColor: colors.white,
              position: 'absolute', top: 2,
              left: routine?.is_favorite ? 20 : 2,
              transition: 'left 0.2s',
            }} />
          </div>
        </div>
      )}

      <main style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isEditing && (
            <RoutineEditForm routine={routine} routineId={routineId} />
          )}

          {/* Workout Days label */}
          {!isEditing && days?.length > 0 && (
            <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>
              {t('routine:workoutDays')}
            </span>
          )}

          {days?.length === 0 && !isEditing ? (
            <p className="text-secondary">{t('routine:day.noDays')}</p>
          ) : (
            days?.map((day, index) => (
              <DayCard
                key={day.id}
                day={day}
                routineId={routineId}
                routineName={routine?.name}
                isEditing={isEditing}
                onAddExercise={handleOpenAddExercise}
                onAddWarmup={handleOpenAddWarmup}
                onEditExercise={handleOpenEditExercise}
                onReplaceExercise={handleOpenReplaceExercise}
                onDuplicateExercise={handleDuplicateExercise}
                onMoveExerciseToDay={handleOpenMoveModal}
                onDelete={(dayId) => setDayToDelete(days.find(d => d.id === dayId))}
                onReorderToPosition={(newIndex) => handleReorderDay(day.id, newIndex)}
                currentIndex={index}
                totalDays={days.length}
                dayNames={days.map(d => d.name)}
                isReorderingDays={reorderDays.isPending}
                hasActiveSession={hasActiveSession}
                activeRoutineDayId={activeRoutineDayId}
              />
            ))
          )}
          {isEditing && (
            <Card
              className="p-4 border-dashed"
              onClick={() => setShowAddDay(true)}
            >
              <div className="flex items-center gap-2 justify-center" style={{ color: colors.textSecondary }}>
                <Plus size={20} />
                <span>{t('routine:day.add')} {nextDayNumber}</span>
              </div>
            </Card>
          )}
      </main>

      {days?.length > 0 && (
        <VolumeSummary days={days} cycleDays={routine?.cycle_days} />
      )}

      <AddDayModal
        isOpen={showAddDay}
        onClose={() => setShowAddDay(false)}
        onSubmit={handleAddDay}
        nextDayNumber={nextDayNumber}
        isPending={createDay.isPending}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={t('routine:delete')}
        message={t('routine:deleteConfirm', { name: routine.name })}
        confirmText={t('common:buttons.delete')}
        onConfirm={handleDeleteRoutine}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        isOpen={!!dayToDelete}
        title={t('routine:day.delete')}
        message={t('routine:day.deleteConfirm', { name: dayToDelete?.name })}
        confirmText={t('common:buttons.delete')}
        onConfirm={handleDeleteDay}
        onCancel={() => setDayToDelete(null)}
      />

      <AddExerciseModal
        isOpen={showAddExercise}
        onClose={() => {
          setShowAddExercise(false)
          setSelectedDayId(null)
          setIsAddingWarmup(false)
          setExistingSupersets([])
        }}
        onSubmit={handleAddExercise}
        isPending={addExercise.isPending}
        isWarmup={isAddingWarmup}
        existingSupersets={existingSupersets}
        existingExercises={allRoutineExercises || []}
      />

      <EditRoutineExerciseModal
        isOpen={showEditExercise}
        onClose={() => {
          setShowEditExercise(false)
          setSelectedExercise(null)
          setSelectedDayId(null)
          setIsReplacing(false)
        }}
        onSubmit={handleEditExercise}
        isPending={updateExercise.isPending}
        routineExercise={selectedExercise}
        existingSupersets={existingSupersets}
        isReplacing={isReplacing}
      />

      <MoveToDayModal
        isOpen={showMoveModal}
        onClose={() => {
          setShowMoveModal(false)
          setExerciseToMove(null)
          setMovingFromDayId(null)
        }}
        onSubmit={handleMoveExerciseToDay}
        days={days}
        currentDayId={movingFromDayId}
        exerciseName={exerciseToMove?.exercise?.name}
        isPending={moveExercise.isPending}
      />
    </div>
  )
}

export default RoutineDetail
