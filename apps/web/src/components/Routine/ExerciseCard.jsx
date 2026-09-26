import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, History, Pencil, Trash2, Copy, FolderInput, ArrowUpDown, Repeat2, Link2Off } from 'lucide-react'
import { DragHandle, Modal, ReorderModal } from '../ui/index.js'
import { ExerciseHistoryModal } from '../Workout/index.js'
import { colors } from '../../lib/styles.js'
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete.js'
import { SetField, getExerciseName, formatEffortBadge, formatFieldValue, resolveTrackedFields, useResolvedDistanceUnit } from '@gym/shared'
import { getMuscleGroupBorderStyle } from '../../lib/muscleGroupStyles.js'

function ExerciseCard({
  routineExercise,
  routineDayId,
  isReordering = false,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveToDay,
  onReplace,
  onRemoveFromSuperset,
  onReorderToPosition,
  currentIndex = 0,
  totalExercises = 1,
  positionLabels = [],
  dragHandleProps = null,
  isDragging = false,
}) {
  const { t } = useTranslation()
  const { exercise, series, reps, level, rir, rest_seconds } = routineExercise
  const [showHistory, setShowHistory] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showReorder, setShowReorder] = useState(false)

  // Memoizado como en WorkoutExerciseCard: devuelve un array nuevo por render y viaja a los
  // useMemo de ExerciseHistoryModal. `exercise` viene de la caché de query (referencia estable).
  const trackedFields = useMemo(() => resolveTrackedFields(exercise), [exercise])
  const distanceUnit = useResolvedDistanceUnit(exercise)

  const swipe = useSwipeToDelete({ onDelete })

  const menuItems = [
    { icon: History, label: t('routine:exercise.viewHistory'), onClick: () => setShowHistory(true) },
    { icon: Pencil, label: t('common:buttons.edit'), onClick: onEdit },
    { icon: Repeat2, label: t('routine:exercise.replace'), onClick: onReplace },
    { icon: Copy, label: t('routine:exercise.duplicateExercise'), onClick: onDuplicate },
    { icon: FolderInput, label: t('routine:exercise.moveToDay'), onClick: onMoveToDay },
    totalExercises > 1 && { icon: ArrowUpDown, label: t('routine:reorder'), onClick: () => setShowReorder(true), disabled: isReordering },
    // Superset members only (whoever renders the row decides whether to pass it).
    onRemoveFromSuperset && { icon: Link2Off, label: t('routine:superset.removeFrom'), onClick: onRemoveFromSuperset, disabled: isReordering },
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ].filter(Boolean)

  const handleCardClick = () => {
    if (swipe.consumeClick()) return
    setShowMenu(true)
  }

  const handleMenuAction = (action) => {
    setShowMenu(false)
    action?.()
  }

  return (
    <>
      {/* hover en el envoltorio, no en la fila: sobre la fila el 80% de opacidad dejaría
          translucir la afordancia roja que tiene detrás.
          `overflow` recorta la fila mientras se desliza, pero se suelta al arrastrar para no
          cortar la sombra que la despega de la lista (igual que en DayCard). */}
      <div className="relative rounded-lg hover:opacity-80" style={{ overflow: isDragging ? 'visible' : 'hidden' }}>
        {/* Afordancia de borrado: invisible en reposo, aparece con el recorrido del dedo */}
        <div
          ref={swipe.affordanceRef}
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-end"
          style={{ backgroundColor: colors.danger, padding: '8px 12px', opacity: 0 }}
        >
          <Trash2 size={16} color={colors.white} />
        </div>
        <div
          ref={swipe.rowRef}
          className="relative rounded-lg cursor-pointer"
          style={{
            backgroundColor: colors.bgTertiary,
            padding: '10px 14px',
            // Sin `pan-y` el navegador móvil se queda el toque para su propio paneo y entrega
            // un pointercancel en vez de los moves: el swipe funcionaría con ratón y no en móvil.
            touchAction: 'pan-y',
            userSelect: 'none',
            // Mientras viaja con el dedo se despega del resto de la lista.
            boxShadow: isDragging ? `0 8px 24px ${colors.shadow}` : undefined,
            ...getMuscleGroupBorderStyle(exercise.muscle_group?.name),
          }}
          {...swipe.handlers}
          onClick={handleCardClick}
        >
          <div className="flex items-center gap-2">
            {/* El asa bloquea el swipe al TOCARLA, no al activarse el arrastre: el swipe se
                clasifica en el primer `pointermove`, antes de que dnd-kit haya recorrido su
                distancia de activación. */}
            <DragHandle
              dragHandleProps={dragHandleProps}
              disabled={isReordering}
              size={14}
              onPressStart={() => { swipe.blockedRef.current = true }}
              onPressEnd={() => { swipe.blockedRef.current = false }}
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate" style={{ color: colors.textPrimary, fontSize: 14 }}>
                {getExerciseName(exercise)}
              </h4>
              <div className="flex flex-wrap gap-3 mt-1">
                <span style={{ color: colors.textSecondary, fontSize: 12 }}>{series}×{reps}</span>
                {level != null && <span style={{ color: colors.textSecondary, fontSize: 12 }}>{formatFieldValue(SetField.LEVEL, level)}</span>}
                {rir !== null && rir !== undefined && <span style={{ color: colors.textSecondary, fontSize: 12 }}>{formatEffortBadge(rir, trackedFields)}</span>}
                {rest_seconds > 0 && <span style={{ color: colors.textSecondary, fontSize: 12 }}>{rest_seconds}s</span>}
              </div>
            </div>
            <ChevronRight size={16} color={colors.textMuted} className="shrink-0" />
          </div>
        </div>
      </div>
      <Modal isOpen={showMenu} onClose={() => setShowMenu(false)} position="bottom" maxWidth="max-w-lg">
        <div className="py-2 pb-6">
          {menuItems.map((item, i) => (
            <button key={i} onClick={() => handleMenuAction(item.onClick)} disabled={item.disabled}
              className="w-full flex items-center gap-3 px-5 py-3 text-sm hover:opacity-80 disabled:opacity-40"
              style={{ color: item.danger ? colors.danger : item.accent ? colors.success : colors.textPrimary }}>
              {item.icon && <item.icon size={18} style={{ color: item.danger ? colors.danger : item.accent ? colors.success : colors.textSecondary }} />}
              {item.label}
            </button>
          ))}
        </div>
      </Modal>
      {/* Montado solo al abrirlo: sus cuatro queries de historial corren aunque el modal esté
          cerrado, y esta fila se repite por cada ejercicio de la rutina. */}
      {showHistory && (
        <ExerciseHistoryModal
          isOpen
          onClose={() => setShowHistory(false)}
          exerciseId={exercise.id}
          exerciseName={getExerciseName(exercise)}
          trackedFields={trackedFields}
          distanceUnit={distanceUnit}
          routineDayId={routineDayId}
        />
      )}
      <ReorderModal
        isOpen={showReorder}
        onClose={() => setShowReorder(false)}
        totalItems={totalExercises}
        currentIndex={currentIndex}
        positionLabels={positionLabels}
        onSelect={(i) => { setShowReorder(false); onReorderToPosition?.(i) }}
      />
    </>
  )
}

export default ExerciseCard
