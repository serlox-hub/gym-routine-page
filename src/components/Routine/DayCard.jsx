import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil } from 'lucide-react'
import { Card } from '../ui/index.js'
import { useRoutineBlocks, useReorderRoutineExercises, useDeleteRoutineExercise, useUpdateRoutineExercise, useUpdateRoutineDay } from '../../hooks/useRoutines.js'
import { colors, inputStyle } from '../../lib/styles.js'

function DayCard({ day, routineId, isEditing, onAddExercise, onAddWarmup, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const navigate = useNavigate()
  const { id, dia_numero, nombre, duracion_estimada_min } = day
  const { data: blocks } = useRoutineBlocks(isEditing ? id : null)
  const reorderExercises = useReorderRoutineExercises()
  const deleteExercise = useDeleteRoutineExercise()
  const updateExercise = useUpdateRoutineExercise()
  const updateDay = useUpdateRoutineDay()
  const [editingExercise, setEditingExercise] = useState(null)
  const [editForm, setEditForm] = useState({ series: '', reps: '' })
  const [editingDay, setEditingDay] = useState(false)
  const [dayForm, setDayForm] = useState({ nombre, duracion: duracion_estimada_min || '' })

  const handleClick = () => {
    if (!isEditing) {
      navigate(`/routine/${routineId}/day/${id}`)
    }
  }

  const warmupBlock = blocks?.find(b => b.nombre === 'Calentamiento')
  const mainBlock = blocks?.find(b => b.nombre === 'Principal')
  const warmupExercises = warmupBlock?.routine_exercises || []
  const mainExercises = mainBlock?.routine_exercises || []
  const allExercises = [...warmupExercises, ...mainExercises]

  const renderExerciseRow = (re, index, exerciseList) => {
    const exercise = re.exercise
    const isEditing = editingExercise === re.id
    const isFirstInList = index === 0
    const isLastInList = index === exerciseList.length - 1

    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <span className="text-sm truncate" style={{ color: colors.textPrimary }}>
                {exercise?.nombre}
              </span>
              <input
                type="number"
                min="1"
                value={editForm.series}
                onChange={(e) => setEditForm(prev => ({ ...prev, series: e.target.value }))}
                className="w-12 p-1 rounded text-sm text-center"
                style={inputStyle}
                onClick={e => e.stopPropagation()}
              />
              <span style={{ color: colors.textSecondary }}>×</span>
              <input
                type="text"
                value={editForm.reps}
                onChange={(e) => setEditForm(prev => ({ ...prev, reps: e.target.value }))}
                className="w-16 p-1 rounded text-sm text-center"
                style={inputStyle}
                onClick={e => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSaveEdit(re.id)
                }}
                className="p-1 rounded text-xs"
                style={{ backgroundColor: colors.accent, color: '#fff' }}
              >
                OK
              </button>
            </div>
          ) : (
            <div>
              <span className="text-sm" style={{ color: colors.textPrimary }}>
                {exercise?.nombre}
              </span>
              <span className="text-sm ml-2" style={{ color: colors.textSecondary }}>
                {re.series}×{re.reps}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {!isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleStartEdit(re)
              }}
              className="p-1 rounded transition-opacity hover:opacity-80"
              style={{ color: colors.textSecondary }}
              title="Editar"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleMoveExercise(re.id, 'up')
            }}
            disabled={isFirstInList && warmupExercises.length === 0}
            className="p-1 rounded transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ color: colors.textSecondary }}
            title="Mover arriba"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleMoveExercise(re.id, 'down')
            }}
            disabled={isLastInList && exerciseList === mainExercises}
            className="p-1 rounded transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ color: colors.textSecondary }}
            title="Mover abajo"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteExercise(re.id)
            }}
            className="p-1 rounded transition-opacity hover:opacity-80"
            style={{ color: '#f85149' }}
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    )
  }

  const handleMoveExercise = (exerciseId, direction) => {
    const currentIndex = allExercises.findIndex(e => e.id === exerciseId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= allExercises.length) return

    const newExercises = [...allExercises]
    const [removed] = newExercises.splice(currentIndex, 1)
    newExercises.splice(newIndex, 0, removed)

    reorderExercises.mutate({ dayId: id, exercises: newExercises })
  }

  const handleDeleteExercise = (exerciseId) => {
    deleteExercise.mutate({ exerciseId, dayId: id })
  }

  const handleStartEdit = (re) => {
    setEditingExercise(re.id)
    setEditForm({ series: String(re.series), reps: re.reps })
  }

  const handleSaveEdit = (exerciseId) => {
    updateExercise.mutate({
      exerciseId,
      dayId: id,
      data: {
        series: parseInt(editForm.series) || 3,
        reps: editForm.reps || '8-12',
      }
    })
    setEditingExercise(null)
  }

  const handleSaveDay = () => {
    const hasChanges = dayForm.nombre.trim() !== nombre ||
      (dayForm.duracion || null) !== (duracion_estimada_min || null)

    if (dayForm.nombre.trim() && hasChanges) {
      updateDay.mutate({
        dayId: id,
        routineId,
        data: {
          nombre: dayForm.nombre.trim(),
          duracion_estimada_min: dayForm.duracion ? parseInt(dayForm.duracion) : null
        }
      })
    }
    setEditingDay(false)
  }

  return (
    <Card
      className={`p-4 ${isEditing ? 'cursor-default' : ''}`}
      onClick={handleClick}
    >
      {isEditing && editingDay ? (
        <div className="space-y-2" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <span className="text-accent font-semibold shrink-0">{dia_numero}</span>
            <input
              type="text"
              value={dayForm.nombre}
              onChange={(e) => setDayForm(prev => ({ ...prev, nombre: e.target.value }))}
              className="flex-1 font-medium p-1 rounded min-w-0"
              style={inputStyle}
              placeholder="Nombre del día"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 pl-8">
            <label className="text-sm" style={{ color: colors.textSecondary }}>
              Duración estimada:
            </label>
            <input
              type="number"
              value={dayForm.duracion}
              onChange={(e) => setDayForm(prev => ({ ...prev, duracion: e.target.value }))}
              className="w-16 p-1 rounded text-sm text-center"
              style={inputStyle}
              placeholder="--"
              min="1"
            />
            <span className="text-sm" style={{ color: colors.textSecondary }}>min</span>
            <button
              onClick={handleSaveDay}
              className="ml-auto px-3 py-1 rounded text-sm"
              style={{ backgroundColor: colors.accent, color: '#fff' }}
            >
              OK
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-accent font-semibold shrink-0">{dia_numero}</span>
            <h3 className="font-medium truncate">{nombre}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {duracion_estimada_min && (
              <span className="text-sm text-muted whitespace-nowrap">{duracion_estimada_min} min</span>
            )}
            {isEditing && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDayForm({ nombre, duracion: duracion_estimada_min || '' })
                    setEditingDay(true)
                  }}
                  className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ color: colors.textSecondary }}
                  title="Editar día"
                >
                  <Pencil size={18} />
                </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveUp(id)
                }}
                disabled={isFirst}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-30"
                style={{ color: colors.textSecondary }}
                title="Mover arriba"
              >
                <ChevronUp size={18} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveDown(id)
                }}
                disabled={isLast}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-30"
                style={{ color: colors.textSecondary }}
                title="Mover abajo"
              >
                <ChevronDown size={18} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(id)
                }}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'rgba(248, 81, 73, 0.1)', color: '#f85149' }}
                title="Eliminar día"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          </div>
        </div>
      )}

      {isEditing && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
          {/* Sección Calentamiento */}
          {warmupExercises.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium mb-2" style={{ color: colors.accent }}>
                Calentamiento
              </div>
              <ul className="space-y-2">
                {warmupExercises.map((re, index) => (
                  <li key={re.id}>
                    {renderExerciseRow(re, index, warmupExercises)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddWarmup(id)
            }}
            className="w-full py-2 mb-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{ border: `1px dashed ${colors.border}`, color: colors.accent }}
          >
            <Plus size={16} />
            Añadir calentamiento
          </button>

          {/* Sección Principal */}
          {mainExercises.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>
                Principal
              </div>
              <ul className="space-y-2">
                {mainExercises.map((re, index) => (
                  <li key={re.id}>
                    {renderExerciseRow(re, index, mainExercises)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddExercise(id)
            }}
            className="w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{ border: `1px dashed ${colors.border}`, color: colors.textSecondary }}
          >
            <Plus size={16} />
            Añadir ejercicio
          </button>
        </div>
      )}
    </Card>
  )
}

export default DayCard
