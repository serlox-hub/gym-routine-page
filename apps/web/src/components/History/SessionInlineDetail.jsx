import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2, ChevronRight, Trophy, Share2, Pencil, Plus, Play, FileText, Video, SlidersHorizontal, AlertCircle, Dumbbell, CalendarPlus } from 'lucide-react'
import { useSessionDetail, useDeleteSession, useUpdateSessionMetadata, useRescheduleSession, useUpsertCompletedSet, useDeleteCompletedSet, useSessionPRs, useStartSession } from '../../hooks/useWorkout.js'
import { useSelectedGym, useReassignSessionGym, getGymDisplayName, resolveTrackedFields, useHistorySetEditor } from '@gym/shared'
import useWorkoutStore from '../../stores/workoutStore.js'
import { LoadingSpinner, ErrorMessage, Card, ConfirmModal, DropdownMenu, IconButton } from '../ui/index.js'
import SetNotesView from '../Workout/SetNotesView.jsx'
import SetValueInput from '../Workout/SetInputs.jsx'
import SetDetailsModal from '../Workout/SetDetailsModal.jsx'
import ExerciseHistoryModal from '../Workout/ExerciseHistoryModal.jsx'
import GymSelector from '../Workout/GymSelector.jsx'
import ConvertToRoutineDayModal from './ConvertToRoutineDayModal.jsx'
import MuscleGroupSetsChart from './MuscleGroupSetsChart.jsx'
import CorrectSessionExerciseAction from './CorrectSessionExerciseAction.jsx'
import { uploadVideo } from '../../lib/videoStorage.js'
import {
  SENSATION_LABELS,
  formatFullDate,
  formatSetValue,
  formatTime,
  resolveSessionEnd,
  resolveSessionStart,
  getSessionStartBounds,
  isSameTimestamp,
  MAX_SESSION_DURATION_DAYS,
  formatDateTimeLocal,
  getSensationColor,
  findPRSetNumbers,
  fetchWorkoutSummary,
  buildPRsByExerciseMap,
  buildEmptySetData,
  getSetColumns,
  getExerciseName,
  groupSessionDetailByBlock,
  translateBlockName,
  BLOCK_NAMES,
  usePreference,
  useResolvedWeightUnit,
  useResolvedDistanceUnit,
  formatEffortBadge,
  buildSessionExercisesFromSession,
  buildRoutineDayFromSession,
  getNotifier,
} from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'
import { colors } from '../../lib/styles.js'

// Fila editable del historial. Usa las MISMAS columnas por lo que mide el ejercicio que la sesión
// (getSetColumns + SetValueInput): antes tenía su propia lista peso/reps/tiempo/distancia, así que
// nivel, kcal y ritmo NO se podían editar y el tiempo se pedía en segundos crudos. Guarda al salir
// de cada campo (onCommit), no con un check como la sesión.
function EditableSetRow({ set, exercise, sessionId, sessionExerciseId, weightUnit, distanceUnit, isSetPR, onUpsert, onDelete }) {
  const { t } = useTranslation()
  const trackedFields = resolveTrackedFields(exercise)
  const columns = getSetColumns(trackedFields, { weightUnit, distanceUnit })
  const [showDetails, setShowDetails] = useState(false)

  // Estado + persistencia (compartido web/native; ver useHistorySetEditor). `showDetails` (si la
  // hoja está abierta) es UI local: no forma parte de la edición de la serie en sí.
  const {
    values, setValues,
    rir, setType, videoUrl, notes,
    hasVideo, hasRir, hasNotes,
    isUploadingVideo, uploadProgress, videoUploadError,
    handleSave, handleRirChange, handleSetTypeChange,
    handleSelectVideo, handleRetryVideoUpload, handleRemoveVideo, handleNotesSubmit,
  } = useHistorySetEditor({
    set, columns, distanceUnit, sessionId, sessionExerciseId, onUpsert, uploadVideo,
  })

  const handleNotesClose = (payload) => {
    handleNotesSubmit(payload)
    setShowDetails(false)
  }

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: `24px ${columns.map(() => 'minmax(0, 1fr)').join(' ')} 150px`, // badges + the 44px «···» box
    alignItems: 'center',
    gap: 12,
    fontSize: 12,
  }

  const badgeStyle = {
    backgroundColor: colors.bgTertiary,
    borderRadius: 6,
    padding: '4px 6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
  }

  // Vistazo, no botón: cada badge señala un dato distinto (nota/vídeo/RIR) y editarlo pasa por el
  // menú «···» → Editar (única puerta a la hoja, siempre disponible). Antes cada badge también
  // abría la hoja, pero la sección correspondiente podía estar oculta por preferencia (nota/vídeo)
  // — un botón que abre una hoja donde no se ve lo que anuncia.
  // `role="img"` + `aria-label`: son badges solo-icono; un `<span>` sin rol no expone `title` como
  // nombre accesible (un `<button>` sí lo hacía de rebote), así que sin esto un lector de pantalla
  // no anunciaría nada — paridad con native, que ya usa `accessible`+`accessibilityLabel`.
  // While the upload has failed, the 44px retry box takes the note badge's place: the column is a
  // fixed 150px and with both it overflows onto the inputs. The note is still one tap away in «···».
  const trailingBadges = (
    <>
      {hasNotes && !videoUploadError && (
        <span style={{ ...badgeStyle, cursor: 'default' }} role="img" aria-label={t('workout:set.notes')} title={t('workout:set.notes')}>
          <FileText size={13} color={colors.textSecondary} />
        </span>
      )}
      {videoUploadError && (
        <IconButton icon={AlertCircle} iconSize={13} color={colors.danger} label={t('common:buttons.retry')} onClick={handleRetryVideoUpload} />
      )}
      {isUploadingVideo && (
        <span style={{ ...badgeStyle, padding: '3px 7px', cursor: 'default' }}>
          <span style={{ color: colors.purple, fontSize: 11, fontWeight: 600 }}>{uploadProgress}%</span>
        </span>
      )}
      {hasVideo && !isUploadingVideo && !videoUploadError && (
        <span style={{ ...badgeStyle, cursor: 'default' }} role="img" aria-label={t('workout:set.addVideo')} title={t('workout:set.addVideo')}>
          <Video size={13} color={colors.textSecondary} />
        </span>
      )}
      {hasRir && (
        <span style={{ ...badgeStyle, padding: '3px 7px', cursor: 'default' }} title={t('workout:set.rir')}>
          <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {formatEffortBadge(rir, trackedFields)}
          </span>
        </span>
      )}
    </>
  )

  // No negative margin on the 44px trigger: rows are only 8px apart, so pulling it back with -my-2
  // made two rows' menus overlap and a tap could open the next set's (whose «Eliminar» has no confirm).
  const menu = (
    <DropdownMenu
      triggerSize={14}
      triggerClassName="shrink-0"
      items={[
        {
          label: t('common:buttons.edit'),
          icon: SlidersHorizontal,
          onClick: () => setShowDetails(true),
        },
        {
          label: t('common:buttons.delete'),
          icon: Trash2,
          onClick: () => onDelete({ sessionId, sessionExerciseId, setNumber: set.set_number }),
          danger: true,
        },
      ]}
    />
  )

  const trailingActions = (
    <div className="flex items-center gap-1.5 justify-end">
      {trailingBadges}
      {menu}
    </div>
  )

  return (
    <>
      <div style={containerStyle}>
        {/* Identidad pura (número / «D» dropset), sin interacción: el menú «···» → Editar (más
            abajo, siempre visible) ya es la puerta a la hoja donde se fija el tipo. Duplicarla
            aquí con un tap sobre el número era una segunda entrada silenciosa a lo mismo. */}
        <span
          className="shrink-0"
          style={{ color: isSetPR ? colors.warning : setType === 'dropset' ? colors.orange : colors.textMuted, fontSize: 12, textAlign: 'center', fontWeight: isSetPR || setType === 'dropset' ? 700 : 400 }}
        >
          {setType === 'dropset' ? 'D' : set.set_number}
        </span>

        {columns.map(({ field, decimal, unit }) => (
          <div key={field} className="flex items-center gap-1 min-w-0">
            <SetValueInput
              field={field}
              decimal={decimal}
              value={values[field]}
              onChange={value => setValues(prev => ({ ...prev, [field]: value }))}
              onCommit={handleSave}
              boxed
            />
            {/* Aquí la unidad va pegada al input: esta pantalla no tiene cabecera de columna
                donde vivir (a diferencia de la sesión). */}
            <span className="text-[10px] shrink-0" style={{ color: colors.textMuted }}>{unit}</span>
          </div>
        ))}
        {trailingActions}
      </div>
      {/* Misma hoja que en sesión, con las 4 secciones (esfuerzo, tipo, nota, vídeo): sin
          `onComplete` (la serie ya está completada, no hay nada que completar de una). */}
      <SetDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        onSubmit={handleNotesClose}
        setNumber={set.set_number}
        isUploadingVideo={isUploadingVideo}
        uploadProgress={uploadProgress}
        onSelectVideo={handleSelectVideo}
        onRemoveVideo={handleRemoveVideo}
        initialNote={notes}
        initialVideoUrl={videoUrl}
        rir={rir}
        onRirChange={handleRirChange}
        trackedFields={trackedFields}
        setType={setType}
        onSetTypeChange={handleSetTypeChange}
      />
    </>
  )
}

function SessionExerciseBlock({ sessionExerciseId, exercise, sets, sessionId, prsByExercise, gymId, isEditing, onUpsertSet, onDeleteSet, onAddSet, onSelectSet }) {
  const { t } = useTranslation()
  const weightUnit = useResolvedWeightUnit(exercise.id, gymId)
  const distanceUnit = useResolvedDistanceUnit(exercise)
  const prData = prsByExercise[exercise.id]
  const prSetNums = prData ? findPRSetNumbers(sets, prData) : null
  const maxSetNumber = sets.length > 0 ? Math.max(...sets.map(s => s.set_number)) : 0
  const [showHistory, setShowHistory] = useState(false)
  const trackedFields = resolveTrackedFields(exercise)
  const isHistoryClickable = !exercise.deleted_at && !isEditing

  return (
    <Card className="p-3" style={getMuscleGroupBorderStyle(exercise.muscle_group?.name)}>
      <div
        onClick={isHistoryClickable ? () => setShowHistory(true) : undefined}
        // min-h-11: a 44px touch target. -mt-2.5 sits it in the card's p-3 and py-2.5 gives the 10px
        // back, so the name stays 12px from the top even when it wraps to two lines.
        className={`flex items-center justify-between gap-2 min-h-11 -mt-2.5 py-2.5 ${isHistoryClickable ? 'cursor-pointer hover:opacity-80' : ''}`}
      >
        <div className="flex items-center gap-2">
          <h3 className={`font-medium ${exercise.deleted_at ? 'text-secondary line-through' : ''}`}>
            {getExerciseName(exercise)}
          </h3>
          {exercise.deleted_at && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.dangerBg, color: colors.danger }}>
              {t('exercise:deleted')}
            </span>
          )}
        </div>
        {isHistoryClickable && (
          <ChevronRight size={16} color={colors.textMuted} />
        )}
        {isEditing && (
          // -my-2.5 gives back the header's py-2.5, so the 44px box keeps the header 44 tall.
          <CorrectSessionExerciseAction
            sessionId={sessionId}
            sessionExerciseId={sessionExerciseId}
            exercise={exercise}
            gymId={gymId}
            className="-my-2.5 -mr-2 flex-shrink-0"
          />
        )}
      </div>
      <div className="space-y-2">
        {isEditing ? (
          <>
            {sets.map(set => (
              <EditableSetRow
                // Correcting the exercise (#168) can convert the weights without changing set.id:
                // remounting reseeds the row's values, or it would save the old weight in the new unit.
                key={`${set.id}:${exercise.id}`}
                set={set}
                exercise={exercise}
                sessionId={sessionId}
                sessionExerciseId={sessionExerciseId}
                weightUnit={weightUnit}
                distanceUnit={distanceUnit}
                isSetPR={prSetNums?.has(set.set_number)}
                onUpsert={onUpsertSet}
                onDelete={onDeleteSet}
              />
            ))}
            <button
              onClick={() => onAddSet(sessionExerciseId, exercise, maxSetNumber)}
              className="flex items-center justify-center gap-1 w-full min-h-11 py-2 rounded text-xs"
              style={{ border: `1px dashed ${colors.border}`, color: colors.success }}
            >
              <Plus size={14} /> {t('workout:set.addSet')}
            </button>
          </>
        ) : (
          sets.map(set => {
            const isSetPR = prSetNums?.has(set.set_number)
            return (
            <div
              key={set.id}
              className="flex items-center gap-3"
              style={{ fontSize: 13 }}
            >
              <span style={{ color: isSetPR ? colors.warning : colors.textMuted, fontSize: 12, width: 14, textAlign: 'right', fontWeight: isSetPR ? 700 : 400 }}>
                {set.set_type === 'dropset' ? 'D' : set.set_number}
              </span>
              <span className="flex-1 flex items-center gap-2" style={{ color: colors.textPrimary }}>
                {formatSetValue({ ...set, weight_unit: weightUnit }, { distanceUnit })}
                {isSetPR && (
                  <span className="inline-flex items-center gap-0.5" style={{ color: colors.warning, fontSize: 10, fontWeight: 600 }}>
                    <Trophy size={10} /> {t('workout:summary.pr')}
                  </span>
                )}
              </span>
              {/* No negative margin: the 44px boxes make a set with a note or video 44 tall, so two
                  consecutive ones do not overlap in the 8px gap. */}
              <div className="flex items-center gap-0.5">
                {set.notes && (
                  <IconButton icon={FileText} iconSize={14} color={colors.textMuted} label={t('workout:set.notes')} onClick={() => onSelectSet(set)} />
                )}
                {set.video_url && (
                  <IconButton icon={Video} iconSize={14} color={colors.textMuted} label={t('workout:set.video')} onClick={() => onSelectSet(set)} />
                )}
                {set.rir_actual !== null && set.rir_actual !== undefined && (
                  <span style={{ color: colors.textMuted, fontSize: 12, minWidth: 16, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {formatEffortBadge(set.rir_actual, trackedFields)}
                  </span>
                )}
              </div>
            </div>
            )
          })
        )}
      </div>
      <ExerciseHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        exerciseId={exercise.id}
        exerciseName={getExerciseName(exercise)}
        trackedFields={trackedFields}
        distanceUnit={distanceUnit}
      />
    </Card>
  )
}

function SessionInlineDetail({ sessionId, onSessionDeleted }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: session, isLoading, error } = useSessionDetail(sessionId)
  const { data: sessionPRs } = useSessionPRs(sessionId)
  const deleteSession = useDeleteSession()
  const updateMetadata = useUpdateSessionMetadata()
  const rescheduleSession = useRescheduleSession()
  const upsertSet = useUpsertCompletedSet()
  const deleteSet = useDeleteCompletedSet()
  const startSessionMutation = useStartSession()
  const reassignGym = useReassignSessionGym()
  const { hasMultiple, gymId: selectedGymId } = useSelectedGym()
  const hasActiveSession = useWorkoutStore(state => state.sessionId !== null)
  const activeSessionSynced = useWorkoutStore(state => state.activeSessionSynced)

  const [selectedSet, setSelectedSet] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRepeatConfirm, setShowRepeatConfirm] = useState(false)
  const [showConvertToDay, setShowConvertToDay] = useState(false)
  const [showGymSelector, setShowGymSelector] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editCompletedAt, setEditCompletedAt] = useState('')
  const [editStartedAt, setEditStartedAt] = useState('')
  const { value: globalWeightUnit } = usePreference('weight_unit')

  const prsByExercise = useMemo(() => buildPRsByExerciseMap(sessionPRs), [sessionPRs])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} />
  if (!session) return null

  const handleStartEdit = () => {
    setIsEditing(true)
    setEditNotes(session.notes || '')
    setEditCompletedAt(session.completed_at || '')
    setEditStartedAt(session.started_at || '')
  }

  const startBounds = getSessionStartBounds({ startedAt: session.started_at, completedAt: session.completed_at })

  const handleStartDateTimeChange = (localValue) => {
    const { startedAtISO } = resolveSessionStart(localValue, { startedAt: session.started_at, completedAt: session.completed_at })
    setEditStartedAt(startedAtISO ?? session.started_at)
  }

  const handleSaveStart = () => {
    const { startedAtISO, durationMinutes } = resolveSessionStart(editStartedAt, {
      startedAt: session.started_at,
      completedAt: session.completed_at,
    })
    // Sin guardia, cada blur dispara una recalculación de PRs por ejercicio de la sesión.
    if (!startedAtISO || isSameTimestamp(startedAtISO, session.started_at)) return
    rescheduleSession.mutate({ sessionId, startedAt: startedAtISO, durationMinutes })
  }

  const handleSaveTime = () => {
    if (!editCompletedAt) return
    const { completedAtISO, durationMinutes } = resolveSessionEnd(editCompletedAt, session.started_at)
    updateMetadata.mutate({
      sessionId,
      completedAt: completedAtISO,
      durationMinutes,
      overallFeeling: session.overall_feeling,
      notes: session.notes,
    })
  }

  const handleSaveNotes = () => {
    updateMetadata.mutate({
      sessionId,
      completedAt: session.completed_at,
      durationMinutes: session.duration_minutes,
      overallFeeling: session.overall_feeling,
      notes: editNotes.trim() || null,
    })
  }

  const handleRepeatWorkout = () => {
    const routineDayId = session.routine_day?.id ?? null
    const routineId = session.routine_day?.routine?.id ?? null
    startSessionMutation.mutate(
      {
        routineDayId,
        routineId,
        routineName: session.routine_day?.routine?.name ?? session.routine_name ?? null,
        dayName: session.day_name ?? session.routine_day?.name ?? null,
        exercises: buildSessionExercisesFromSession(session.exercises),
        gymId: selectedGymId,
      },
      {
        onSuccess: () => {
          setShowRepeatConfirm(false)
          if (routineId && routineDayId) {
            navigate(`/routine/${routineId}/day/${routineDayId}/workout`)
          } else {
            navigate('/workout/free')
          }
        },
      }
    )
  }

  // Always offered: with nothing to copy, the press says so instead of opening a dialog that could
  // only fail.
  const handleOpenConvertToDay = () => {
    if (buildRoutineDayFromSession(session.exercises).exercises.length === 0) {
      getNotifier()?.show(t('workout:history.convertToDay.nothingToCopy'), 'info')
      return
    }
    setShowConvertToDay(true)
  }

  // The day id travels as navigation state: RoutineDetail reads it once and clears it.
  const handleConvertedToDay = ({ routineId, dayId }) => {
    setShowConvertToDay(false)
    navigate(`/routine/${routineId}`, { state: { expandDayId: dayId } })
  }

  const handleReassignGym = (newGymId) => {
    if (newGymId == null || String(newGymId) === String(session.gym_id)) return
    reassignGym.mutate({ sessionId, newGymId })
  }

  const gymName = session.gym ? getGymDisplayName(session.gym, t('common:gym.defaultName')) : null

  const exerciseBlocks = groupSessionDetailByBlock(session.exercises)
  // Split by block only when there is a warm-up: the sets-per-muscle-group bars leave it out, so
  // the list has to show which exercises those are.
  const showBlockHeaders = exerciseBlocks.some(block => block.blockName === BLOCK_NAMES.WARMUP)

  const handleUpsertSet = (setData) => upsertSet.mutate(setData)
  const handleDeleteSet = (setData) => deleteSet.mutate(setData)

  const handleAddSet = (sessionExerciseId, exercise, currentMaxSetNumber) => {
    upsertSet.mutate(buildEmptySetData({
      sessionId,
      sessionExerciseId,
      setNumber: currentMaxSetNumber + 1,
      exercise,
    }))
  }

  const handleDateTimeChange = (localValue) => {
    if (!localValue) return
    const { completedAtISO } = resolveSessionEnd(localValue, session.started_at)
    setEditCompletedAt(completedAtISO)
  }

  return (
    <div>
      {/* Header — always visible */}
      <div className="mb-6" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="flex items-center justify-between">
          {isEditing ? (
            <>
              <span className="truncate flex-1 min-w-0" style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 700 }}>
                {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
              </span>
              <button onClick={() => setIsEditing(false)} className="shrink-0 ml-3 min-h-11 hover:opacity-80" style={{ color: colors.success, fontSize: 14, fontWeight: 600 }}>
                {t('common:buttons.done')}
              </button>
            </>
          ) : (
            <>
              <span style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 700 }}>
                {session.day_name || session.routine_day?.name || t('workout:session.freeWorkout')}
              </span>
              <DropdownMenu items={[
                // Mientras no se sepa si hay sesión activa no se ofrece: rebotaría en el guard del servidor.
                !hasActiveSession && activeSessionSynced && { icon: Play, label: t('workout:history.repeatWorkout'), onClick: () => setShowRepeatConfirm(true) },
                { icon: CalendarPlus, label: t('workout:history.convertToDay.menu'), onClick: handleOpenConvertToDay },
                { icon: Pencil, label: t('common:buttons.edit'), onClick: handleStartEdit },
                { icon: Share2, label: t('common:buttons.share'), onClick: async () => {
                  const summaryData = await fetchWorkoutSummary(sessionId, { weightUnit: globalWeightUnit })
                  navigate('/workout/summary', { state: { summaryData, fromHistory: true } })
                } },
                { icon: Trash2, label: t('common:buttons.delete'), onClick: () => setShowDeleteConfirm(true), danger: true },
              ]} />
            </>
          )}
        </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <div>
            <div style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>{t('workout:history.startDateTime')}</div>
            <input
              type="datetime-local"
              aria-label={t('workout:history.startDateTime')}
              value={formatDateTimeLocal(editStartedAt || session.started_at)}
              min={formatDateTimeLocal(startBounds.minDate)}
              max={formatDateTimeLocal(startBounds.maxDate)}
              onChange={e => handleStartDateTimeChange(e.target.value)}
              onBlur={handleSaveStart}
              className="w-full min-h-11 px-2 py-1 rounded text-xs"
              style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: 'none', borderBottom: `1px solid ${colors.border}`, colorScheme: 'dark' }}
            />
            {/* El clamp no puede ser mudo: sin esto el picker rechaza fechas anteriores sin decir por qué. */}
            <div style={{ color: colors.textMuted, fontSize: 10, marginTop: 4 }}>
              {t('workout:history.startDateTimeHint', { days: MAX_SESSION_DURATION_DAYS })}
            </div>
            {rescheduleSession.isError && (
              <ErrorMessage message={rescheduleSession.error.message} />
            )}
          </div>
          <div>
            <div style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>{t('workout:history.endDateTime')}</div>
            <input
              type="datetime-local"
              aria-label={t('workout:history.endDateTime')}
              value={formatDateTimeLocal(editCompletedAt || session.completed_at)}
              min={formatDateTimeLocal(session.started_at)}
              max={formatDateTimeLocal(new Date())}
              onChange={e => handleDateTimeChange(e.target.value)}
              onBlur={handleSaveTime}
              className="w-full min-h-11 px-2 py-1 rounded text-xs"
              style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: 'none', borderBottom: `1px solid ${colors.border}`, colorScheme: 'dark' }}
            />
          </div>
          <div>
            <div style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>{t('common:labels.notes')}</div>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder={t('workout:session.notesPlaceholder')}
              rows={2}
              className="w-full rounded px-2 py-1 text-xs"
              style={{ backgroundColor: colors.bgPrimary, color: colors.textPrimary, border: 'none', borderBottom: `1px solid ${colors.border}`, resize: 'none' }}
            />
          </div>
        </div>
      ) : (
        <>

          {/* Routine name + gym */}
          {(session.routine_day?.routine?.name || session.routine_name || (hasMultiple && gymName)) && (
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              {(session.routine_day?.routine?.name || session.routine_name) && (
                <span style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {session.routine_day?.routine?.name || session.routine_name}
                </span>
              )}
              {/* The button is the 44px box, the pill inside keeps its size. */}
              {hasMultiple && gymName && (
                <button
                  onClick={() => setShowGymSelector(true)}
                  disabled={reassignGym.isPending}
                  className="min-h-11 inline-flex items-center hover:opacity-80 transition-opacity disabled:opacity-50"
                  title={t('common:gym.reassignSession')}
                >
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}` }}
                  >
                    <Dumbbell size={11} style={{ color: colors.textMuted }} />
                    <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600 }}>{gymName}</span>
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Date, time, duration, sensation — one line */}
          <div className="flex items-center flex-wrap gap-x-1" style={{ color: colors.textMuted, fontSize: 12 }}>
            <span className="capitalize">{formatFullDate(session.started_at)}</span>
            <span>·</span>
            <span>{formatTime(session.started_at)}</span>
            {session.duration_minutes != null && (
              <>
                <span>·</span>
                <span>{session.duration_minutes > 0 ? `${session.duration_minutes} ${t('common:time.min')}` : `< 1 ${t('common:time.min')}`}</span>
              </>
            )}
            {session.overall_feeling && (
              <>
                <span>·</span>
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: getSensationColor(session.overall_feeling), color: colors.bgPrimary, fontSize: 10, fontWeight: 600 }}
                >
                  {SENSATION_LABELS[session.overall_feeling]}
                </span>
              </>
            )}
          </div>

          {/* Notes */}
          {session.notes && (
            <p style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{session.notes}</p>
          )}

          <MuscleGroupSetsChart exercises={session.exercises} />
        </>
      )}
      </div>

      {/* Exercises */}
      {!showBlockHeaders && (
        <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block' }}>{t('workout:session.exercises')}</span>
      )}
      <div className="space-y-4">
        {exerciseBlocks.map(({ blockName, exercises }) => (
          <section key={blockName}>
            {showBlockHeaders && (
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.success, marginBottom: 8, display: 'block' }}>
                {translateBlockName(blockName)} ({exercises.length})
              </span>
            )}
            <div className="space-y-3">
              {exercises.map(({ sessionExerciseId, exercise, sets }) => (
                <SessionExerciseBlock
                  key={sessionExerciseId}
                  sessionExerciseId={sessionExerciseId}
                  exercise={exercise}
                  sets={sets}
                  sessionId={sessionId}
                  prsByExercise={prsByExercise}
                  gymId={session.gym_id ?? null}
                  isEditing={isEditing}
                  onUpsertSet={handleUpsertSet}
                  onDeleteSet={handleDeleteSet}
                  onAddSet={handleAddSet}
                  onSelectSet={setSelectedSet}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Modals */}
      <SetNotesView
        isOpen={!!selectedSet}
        onClose={() => setSelectedSet(null)}
        notes={selectedSet?.notes}
        videoUrl={selectedSet?.video_url}
      />

      <ConfirmModal
        isOpen={showRepeatConfirm}
        title={t('workout:history.repeatWorkout')}
        message={t('workout:history.repeatConfirm')}
        confirmText={t('workout:session.start')}
        loadingText={t('common:buttons.loading')}
        variant="primary"
        isLoading={startSessionMutation.isPending}
        onConfirm={handleRepeatWorkout}
        onCancel={() => setShowRepeatConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={t('workout:history.deleteSession')}
        message={t('workout:session.deleteConfirm')}
        confirmText={t('common:buttons.delete')}
        loadingText={t('common:buttons.loading')}
        isLoading={deleteSession.isPending}
        onConfirm={() => {
          deleteSession.mutate({
            sessionId,
            exerciseIds: session.exercises?.map(e => e.exercise?.id).filter(Boolean) || [],
            sessionDate: session.started_at,
            gymId: session.gym_id,
          }, {
            onSuccess: () => {
              setShowDeleteConfirm(false)
              onSessionDeleted?.()
            },
          })
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <GymSelector
        isOpen={showGymSelector}
        onClose={() => setShowGymSelector(false)}
        selectedGymId={session.gym_id}
        onSelect={handleReassignGym}
      />

      {showConvertToDay && (
        <ConvertToRoutineDayModal
          session={session}
          onClose={() => setShowConvertToDay(false)}
          onConverted={handleConvertedToDay}
        />
      )}
    </div>
  )
}

export default SessionInlineDetail
