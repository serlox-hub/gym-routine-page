import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil } from 'lucide-react'
import { Card } from '../ui/index.js'
import { useRoutineBlocks, useReorderRoutineExercises, useDeleteRoutineExercise, useUpdateRoutineDay } from '../../hooks/useRoutines.js'
import { colors } from '../../lib/styles.js'
import ExerciseRow from './ExerciseRow.jsx'
import DayEditForm from './DayEditForm.jsx'

function DayCard({ day, routineId, isEditing, onAddExercise, onAddWarmup, onEditExercise, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const navigate = useNavigate()
  const { id, orden, nombre, duracion_estimada_min } = day
  const { data: blocks } = useRoutineBlocks(isEditing ? id : null)
  const reorderExercises = useReorderRoutineExercises()
  const deleteExercise = useDeleteRoutineExercise()
  const updateDay = useUpdateRoutineDay()
  const [editingDay, setEditingDay] = useState(false)
  const [dayForm, setDayForm] = useState({ nombre, duracion: duracion_estimada_min || '' })

  const warmupBlock = blocks?.find(b => b.nombre === 'Calentamiento')
  const mainBlock = blocks?.find(b => b.nombre === 'Principal')
  const warmupExercises = warmupBlock?.routine_exercises || []
  const mainExercises = mainBlock?.routine_exercises || []
  const allExercises = [...warmupExercises, ...mainExercises]

  const handleClick = () => {
    if (!isEditing) {
      navigate(`/routine/${routineId}/day/${id}`)
    }
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

  const renderExerciseList = (exercises, sectionLabel, labelColor, canMoveUpFromSection) => (
    exercises.length > 0 && (
      <div className="mb-4">
        <div className="text-xs font-medium mb-2" style={{ color: labelColor }}>
          {sectionLabel}
        </div>
        <ul className="space-y-2">
          {exercises.map((re, index) => (
            <li key={re.id}>
              <ExerciseRow
                routineExercise={re}
                index={index}
                totalCount={exercises.length}
                canMoveUp={canMoveUpFromSection}
                onEdit={() => onEditExercise(re, id)}
                onMoveUp={() => handleMoveExercise(re.id, 'up')}
                onMoveDown={() => handleMoveExercise(re.id, 'down')}
                onDelete={() => handleDeleteExercise(re.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    )
  )

  return (
    <Card className={`p-4 ${isEditing ? 'cursor-default' : ''}`} onClick={handleClick}>
      {isEditing && editingDay ? (
        <DayEditForm
          dayNumber={orden}
          form={dayForm}
          setForm={setDayForm}
          onSave={handleSaveDay}
        />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-accent font-semibold shrink-0">{orden}</span>
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
                  onClick={(e) => { e.stopPropagation(); onMoveUp(id) }}
                  disabled={isFirst}
                  className="p-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-30"
                  style={{ color: colors.textSecondary }}
                  title="Mover arriba"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveDown(id) }}
                  disabled={isLast}
                  className="p-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-30"
                  style={{ color: colors.textSecondary }}
                  title="Mover abajo"
                >
                  <ChevronDown size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(id) }}
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
          {renderExerciseList(warmupExercises, 'Calentamiento', colors.accent, false)}
          <button
            onClick={(e) => { e.stopPropagation(); onAddWarmup(id) }}
            className="w-full py-2 mb-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
            style={{ border: `1px dashed ${colors.border}`, color: colors.accent }}
          >
            <Plus size={16} />
            Añadir calentamiento
          </button>

          {renderExerciseList(mainExercises, 'Principal', colors.textSecondary, warmupExercises.length > 0)}
          <button
            onClick={(e) => { e.stopPropagation(); onAddExercise(id) }}
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
