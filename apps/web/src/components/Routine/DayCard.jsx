import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trash2, Play, Pencil, ArrowUpDown, Copy } from 'lucide-react'
import { Card, ConfirmModal, DragHandle, DropdownMenu, LoadingSpinner, Modal } from '../ui/index.js'
import { useRoutineBlocks, useReorderRoutineExercises, useDeleteRoutineExercise, useUpdateRoutineDay } from '../../hooks/useRoutines.js'
import { useStartSession } from '../../hooks/useWorkout.js'
import { colors } from '../../lib/styles.js'
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete.js'
import { getExistingSupersetIds, getRoutineDayLayout, moveItemToPosition, useSelectedGym, getRoutineDayAction, WORKOUT_START_ACTION, getNotifier } from '@gym/shared'
import AddExerciseButton from './AddExerciseButton.jsx'
import BlockSection from './BlockSection.jsx'

function DayCard({ day, routineId, routineName, onAddExercise, onAddWarmup, onEditExercise, onReplaceExercise, onDuplicateExercise, onMoveExerciseToDay, onDelete, onDuplicate, isDuplicatingDay = false, onReorderToPosition, currentIndex = 0, totalDays = 1, dayNames = [], isReorderingDays = false, hasActiveSession, activeRoutineDayId, activeSessionSynced, dragHandleProps = null, isDragging = false }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id, name } = day
  const [isExpanded, setIsExpanded] = useState(false)

  // Cargar bloques siempre (necesarios para iniciar workout)
  const { data: blocks, isLoading: loadingBlocks } = useRoutineBlocks(id)
  const { gymId } = useSelectedGym()
  const startSessionMutation = useStartSession()
  const reorderExercises = useReorderRoutineExercises()
  const deleteExercise = useDeleteRoutineExercise()
  const updateDay = useUpdateRoutineDay()
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [exerciseToDelete, setExerciseToDelete] = useState(null)

  const {
    warmupBlock, mainBlock, warmupExercises, mainExercises, allExercises, totalSets,
    showWarmupSection, showMainSection, showEmptyMessage,
  } = getRoutineDayLayout(blocks)

  const existingSupersets = getExistingSupersetIds(allExercises)

  // Se escucha solo la cabecera (el cuerpo tiene los swipes de sus ejercicios), pero se desliza
  // la tarjeta entera. El asa queda fuera de la zona para que el arrastre no compita con el swipe.
  const swipe = useSwipeToDelete({ onDelete: () => onDelete(id) })

  const handleClick = () => {
    if (swipe.consumeClick()) return
    setIsExpanded(!isExpanded)
  }

  const dayAction = getRoutineDayAction({
    hasActiveSession,
    activeRoutineDayId,
    dayId: id,
    isStarting: startSessionMutation.isPending,
    isLoading: loadingBlocks,
    hasSynced: activeSessionSynced,
  })
  const isBusy = dayAction === WORKOUT_START_ACTION.BUSY

  const handleStartWorkout = (e) => {
    e.stopPropagation()
    startSessionMutation.mutate(
      { routineDayId: id, routineId: parseInt(routineId), routineName, dayName: name, blocks, gymId },
      {
        onSuccess: () => navigate(`/routine/${routineId}/day/${id}/workout`)
      }
    )
  }

  const handleContinueWorkout = (e) => {
    e.stopPropagation()
    navigate(`/routine/${routineId}/day/${id}/workout`)
  }

  // Mismo criterio que el botón de entrenamiento libre: bloqueado no puede ser mudo.
  const handleStartPress = (e) => {
    switch (dayAction) {
      case WORKOUT_START_ACTION.RESUME:
        handleContinueWorkout(e)
        return
      case WORKOUT_START_ACTION.BLOCKED:
        e.stopPropagation()
        getNotifier()?.show(t('workout:session.finishCurrentFirst'), 'info')
        return
      case WORKOUT_START_ACTION.START:
        handleStartWorkout(e)
        return
      case WORKOUT_START_ACTION.BUSY:
        e.stopPropagation()
        return  // bloques sin cargar, arranque en vuelo, o sesión activa aún desconocida
    }
  }

  const handleReorderWarmup = (exerciseId, newIndex) => {
    const newExercises = moveItemToPosition(warmupExercises, exerciseId, newIndex)
    if (newExercises) {
      // Combinar con main exercises para enviar todo el día
      reorderExercises.mutate({ dayId: id, exercises: [...newExercises, ...mainExercises] })
    }
  }

  const handleReorderMain = (exerciseId, newIndex) => {
    const newExercises = moveItemToPosition(mainExercises, exerciseId, newIndex)
    if (newExercises) {
      // Combinar con warmup exercises para enviar todo el día
      reorderExercises.mutate({ dayId: id, exercises: [...warmupExercises, ...newExercises] })
    }
  }

  const handleDeleteExercise = () => {
    if (!exerciseToDelete) return
    deleteExercise.mutate({ exerciseId: exerciseToDelete.id, dayId: id })
    setExerciseToDelete(null)
  }

  const handleRenameDay = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== name) {
      updateDay.mutate({ dayId: id, routineId, data: { name: trimmed } })
    }
    setShowRenameModal(false)
  }


  return (
    <>
      {/* `overflow` recorta la tarjeta mientras se desliza, pero se suelta al arrastrar para no
          cortar la sombra que la despega de la lista. */}
      <div className="relative" style={{ borderRadius: 14, overflow: isDragging ? 'visible' : 'hidden' }}>
        {/* Afordancia de borrado: invisible en reposo, aparece con el recorrido del dedo */}
        <div
          ref={swipe.affordanceRef}
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-end"
          style={{ backgroundColor: colors.danger, padding: '0 16px', opacity: 0 }}
        >
          <Trash2 size={18} color={colors.white} />
        </div>
        <div ref={swipe.rowRef} className="relative">
          <Card
            noHover
            style={{
              borderRadius: 14,
              padding: '12px 14px',
              // Mientras viaja con el dedo se despega del resto de la lista.
              boxShadow: isDragging ? `0 8px 24px ${colors.shadow}` : undefined,
            }}
          >
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleClick}>
              <DragHandle dragHandleProps={dragHandleProps} disabled={isReorderingDays} />
              <div
                className="flex items-center justify-between gap-2 min-w-0 flex-1"
                // Sin `pan-y` el navegador móvil se queda el toque para su propio paneo y entrega
                // un pointercancel en vez de los moves (mismo motivo que en ExerciseCard).
                style={{ touchAction: 'pan-y', userSelect: 'none' }}
                {...swipe.handlers}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold truncate" style={{ color: colors.textPrimary, fontSize: 15 }}>{name}</h3>
                  {/* Dice que hay contenido dentro sin gastar un icono (el chevron) en la cabecera. */}
                  {!loadingBlocks && (
                    <p style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {t('common:home.nExercises', { count: allExercises.length })}
                      {totalSets > 0 && ` · ${t('common:home.nSets', { count: totalSets })}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={handleStartPress}
                    disabled={isBusy}
                    className="p-1 rounded hover:opacity-80 disabled:opacity-40"
                    style={{ opacity: dayAction === WORKOUT_START_ACTION.BLOCKED ? 0.4 : undefined }}
                  >
                    {/* BUSY es transitorio: se pinta cargando, no como un play que no responde. */}
                    {isBusy
                      ? <LoadingSpinner inline />
                      : <Play size={20} style={{ color: colors.success }} />
                    }
                  </button>
                  <DropdownMenu
                    items={[
                      {
                        icon: Pencil,
                        label: t('routine:day.rename'),
                        onClick: () => {
                          setRenameValue(name)
                          setShowRenameModal(true)
                        }
                      },
                      { icon: Copy, label: t('routine:day.duplicate'), onClick: () => onDuplicate(id), disabled: isDuplicatingDay },
                      totalDays > 1 && {
                        icon: ArrowUpDown,
                        label: t('routine:reorder'),
                        disabled: isReorderingDays,
                        children: Array.from({ length: totalDays }, (_, i) => ({
                          label: `${i + 1}. ${dayNames[i] || ''}`,
                          onClick: () => onReorderToPosition(i),
                          active: i === currentIndex,
                          disabled: i === currentIndex || isReorderingDays,
                        })),
                      },
                      { icon: Trash2, label: t('common:buttons.delete'), onClick: () => onDelete(id), danger: true },
                    ]}
                  />
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-3 space-y-4">
                {loadingBlocks ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    {/* Un bloque vacío se queda en su fila de añadir: una sección con "(0)" haría
                        parecer roto un día al que solo le falta el calentamiento. */}
                    {showWarmupSection ? (
                      <BlockSection
                        block={warmupBlock}
                        routineDayId={id}
                        isReordering={reorderExercises.isPending}
                        onAddExercise={() => onAddWarmup(id, existingSupersets)}
                        onEditExercise={(re) => onEditExercise(re, id, existingSupersets)}
                        onReplaceExercise={(re) => onReplaceExercise(re, id)}
                        onReorderExercise={handleReorderWarmup}
                        onDeleteExercise={(re) => setExerciseToDelete(re)}
                        onDuplicateExercise={(re) => onDuplicateExercise(re, id)}
                        onMoveExerciseToDay={(re) => onMoveExerciseToDay(re, id)}
                      />
                    ) : (
                      <AddExerciseButton isWarmup onClick={() => onAddWarmup(id, existingSupersets)} />
                    )}
                    {showMainSection ? (
                      <BlockSection
                        block={mainBlock}
                        routineDayId={id}
                        isReordering={reorderExercises.isPending}
                        onAddExercise={() => onAddExercise(id, existingSupersets)}
                        onEditExercise={(re) => onEditExercise(re, id, existingSupersets)}
                        onReplaceExercise={(re) => onReplaceExercise(re, id)}
                        onReorderExercise={handleReorderMain}
                        onDeleteExercise={(re) => setExerciseToDelete(re)}
                        onDuplicateExercise={(re) => onDuplicateExercise(re, id)}
                        onMoveExerciseToDay={(re) => onMoveExerciseToDay(re, id)}
                      />
                    ) : (
                      <>
                        {showEmptyMessage && (
                          <p className="text-secondary text-sm">{t('routine:block.noExercises')}</p>
                        )}
                        <AddExerciseButton onClick={() => onAddExercise(id, existingSupersets)} />
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!exerciseToDelete}
        title={t('routine:exercise.removeFromRoutine')}
        message={t('routine:exercise.removeConfirm', { name: exerciseToDelete?.exercise?.name })}
        confirmText={t('common:buttons.delete')}
        onConfirm={handleDeleteExercise}
        onCancel={() => setExerciseToDelete(null)}
      />

      <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} position="bottom" maxWidth="max-w-lg">
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700 }}>{t('routine:day.rename')}</h3>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>{t('routine:day.name')}</label>
            <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              autoFocus className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameDay()} />
          </div>
          <button onClick={handleRenameDay} disabled={!renameValue.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
            {t('common:buttons.save')}
          </button>
        </div>
      </Modal>
    </>
  )
}

export default DayCard
