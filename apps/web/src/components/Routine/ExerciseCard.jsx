import { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, History, Pencil, Trash2, Copy, FolderInput, ArrowUpDown, Repeat2 } from 'lucide-react'
import { Modal, ReorderModal } from '../ui/index.js'
import { ExerciseHistoryModal } from '../Workout/index.js'
import { colors, design } from '../../lib/styles.js'
import { SetField, getExerciseName, formatEffortBadge, formatFieldValue, resolveTrackedFields, useResolvedDistanceUnit, shouldClaimSwipe, clampSwipeOffset } from '@gym/shared'
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
  onReorderToPosition,
  currentIndex = 0,
  totalExercises = 1,
  positionLabels = [],
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

  // Estado del gesto de swipe. Vive en refs porque se escribe en cada pointermove y pintar la
  // fila por frame desde el estado de React remontaría la tarjeta entera en cada uno.
  const rowRef = useRef(null)
  const affordanceRef = useRef(null)
  const gesture = useRef({ pointerId: null, startX: 0, startY: 0, phase: 'idle', offset: 0 })
  // El click de apertura del menú llega DESPUÉS del pointerup: sin esta bandera, un swipe
  // abandonado antes del umbral volvería a su sitio y además abriría el menú de seis entradas.
  const suppressClick = useRef(false)
  // Seam para el arrastre-para-reordenar (long press + vertical sobre esta misma fila): mientras
  // su pulsación esté pendiente o activa pondrá esto a true y el swipe no reclamará el gesto.
  // Hoy nadie lo escribe. Ver docs/DECISIONS.md (issue #78).
  const swipeBlocked = useRef(false)

  const menuItems = [
    { icon: History, label: t('routine:exercise.viewHistory'), onClick: () => setShowHistory(true) },
    { icon: Pencil, label: t('common:buttons.edit'), onClick: onEdit },
    { icon: Repeat2, label: t('routine:exercise.replace'), onClick: onReplace },
    { icon: Copy, label: t('routine:exercise.duplicateExercise'), onClick: onDuplicate },
    { icon: FolderInput, label: t('routine:exercise.moveToDay'), onClick: onMoveToDay },
    totalExercises > 1 && { icon: ArrowUpDown, label: t('routine:reorder'), onClick: () => setShowReorder(true), disabled: isReordering },
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ].filter(Boolean)

  const paintRow = (offset, animated) => {
    const row = rowRef.current
    if (!row) return
    row.style.transition = animated ? `transform ${design.slideAnimDuration}ms ease-out` : 'none'
    row.style.transform = `translateX(${offset}px)`
    // La afordancia se descubre interpolando su opacidad con el propio recorrido, igual que
    // native: dejarla en rojo sólido aquí haría que el mismo gesto se viera distinto en cada
    // app. Comparte el recorrido (`swipeDeleteMaxTravel`), no una constante nueva.
    const affordance = affordanceRef.current
    if (!affordance) return
    affordance.style.transition = animated ? `opacity ${design.slideAnimDuration}ms ease-out` : 'none'
    affordance.style.opacity = String(Math.min(1, Math.abs(offset) / design.swipeDeleteMaxTravel))
  }

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Un gesto por vez: un segundo dedo sobre la fila NO reclasifica el que ya está en vuelo.
    // Sin esta guarda, apoyar el pulgar a mitad de swipe devolvía `phase` a 'undecided' y la
    // fila se quedaba encallada abierta al soltar, con la captura sin liberar.
    if (gesture.current.phase !== 'idle') return
    suppressClick.current = false
    gesture.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, phase: 'undecided', offset: 0 }
  }

  const handlePointerMove = (e) => {
    const g = gesture.current
    if (g.phase === 'idle' || g.phase === 'yield') return
    if (e.pointerId !== g.pointerId) return

    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY

    if (g.phase === 'undecided') {
      // Nada se reclama al tocar: el primer movimiento que pasa de la distancia de activación
      // en CUALQUIER eje clasifica el gesto una sola vez. Lo que no es swipe cede el resto del
      // gesto, y así la lista sigue scrolleando en vertical.
      if (Math.abs(dx) < design.gestureActivationDistance && Math.abs(dy) < design.gestureActivationDistance) return
      const claimed = shouldClaimSwipe(dx, dy, {
        activationDistance: design.gestureActivationDistance,
        blocked: swipeBlocked.current,
      })
      g.phase = claimed ? 'swipe' : 'yield'
      if (!claimed) return
      // La captura mantiene los moves llegando aunque el dedo se salga de la fila. Por eso NO
      // se cablea `pointerleave` (a diferencia de StreakCard): con captura no se alcanza.
      e.currentTarget.setPointerCapture?.(e.pointerId)
      suppressClick.current = true
    }

    g.offset = clampSwipeOffset(dx, design.swipeDeleteMaxTravel)
    paintRow(g.offset, false)
  }

  const endGesture = (e, commit) => {
    const g = gesture.current
    if (g.phase === 'idle' || e.pointerId !== g.pointerId) return
    const wasSwipe = g.phase === 'swipe'
    const offset = g.offset
    gesture.current = { pointerId: null, startX: 0, startY: 0, phase: 'idle', offset: 0 }

    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    // La fila nunca se queda abierta, salga por donde salga el gesto: quien sostiene la
    // decisión es el ConfirmModal del día.
    if (offset !== 0) paintRow(0, true)
    if (wasSwipe && commit && offset <= -design.swipeDeleteThreshold) onDelete?.()
  }

  const handleCardClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    setShowMenu(true)
  }

  const handleMenuAction = (action) => {
    setShowMenu(false)
    action?.()
  }

  return (
    <>
      {/* hover en el envoltorio, no en la fila: sobre la fila el 80% de opacidad dejaría
          translucir la afordancia roja que tiene detrás */}
      <div className="relative rounded-lg overflow-hidden hover:opacity-80">
        {/* Afordancia de borrado: invisible en reposo, aparece con el recorrido del dedo */}
        <div
          ref={affordanceRef}
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-end"
          style={{ backgroundColor: colors.danger, padding: '8px 12px', opacity: 0 }}
        >
          <Trash2 size={16} color={colors.white} />
        </div>
        <div
          ref={rowRef}
          className="relative rounded-lg cursor-pointer"
          style={{
            backgroundColor: colors.bgTertiary,
            padding: '10px 14px',
            // Sin `pan-y` el navegador móvil se queda el toque para su propio paneo y entrega
            // un pointercancel en vez de los moves: el swipe funcionaría con ratón y no en móvil.
            touchAction: 'pan-y',
            userSelect: 'none',
            ...getMuscleGroupBorderStyle(exercise.muscle_group?.name),
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(e) => endGesture(e, true)}
          onPointerCancel={(e) => endGesture(e, false)}
          onClick={handleCardClick}
        >
          <div className="flex items-center gap-2">
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
