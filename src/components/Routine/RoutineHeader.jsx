import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Download, Trash2, Copy } from 'lucide-react'
import { useUpdateRoutine, useDuplicateRoutine } from '../../hooks/useRoutines.js'
import { colors, inputStyle } from '../../lib/styles.js'
import { exportRoutine, downloadRoutineAsJson } from '../../lib/routineIO.js'
import { sanitizeFilename } from '../../lib/textUtils.js'
import { PageHeader } from '../ui/index.js'

const DEBOUNCE_MS = 500

function RoutineHeader({ routine, routineId, isEditing, onEditStart, onEditEnd, onDelete }) {
  const navigate = useNavigate()
  const [editForm, setEditForm] = useState({ name: '', description: '', goal: '' })
  const debounceRef = useRef(null)
  const updateRoutine = useUpdateRoutine()
  const duplicateRoutine = useDuplicateRoutine()

  useEffect(() => {
    if (routine && !isEditing) {
      setEditForm({
        name: routine.name || '',
        description: routine.description || '',
        goal: routine.goal || '',
      })
    }
  }, [routine, isEditing])

  const saveChanges = useCallback((formData) => {
    if (!formData.name.trim()) return

    updateRoutine.mutate({
      routineId: parseInt(routineId),
      data: {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        goal: formData.goal.trim() || null,
      }
    })
  }, [routineId, updateRoutine])

  const handleFieldChange = (field, value) => {
    const newForm = { ...editForm, [field]: value }
    setEditForm(newForm)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      saveChanges(newForm)
    }, DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleExport = async () => {
    try {
      const data = await exportRoutine(parseInt(routineId))
      const filename = `${sanitizeFilename(routine.name)}.json`
      downloadRoutineAsJson(data, filename)
    } catch {
      // Silent fail - export errors are not critical
    }
  }

  const handleDuplicate = async () => {
    try {
      const newRoutine = await duplicateRoutine.mutateAsync({
        routineId: parseInt(routineId)
      })
      navigate(`/routine/${newRoutine.id}`)
    } catch {
      // Silent fail - duplicate errors are not critical
    }
  }

  const menuItems = [
    { icon: Pencil, label: 'Editar', onClick: onEditStart },
    { icon: Copy, label: 'Duplicar', onClick: handleDuplicate },
    { icon: Download, label: 'Exportar', onClick: handleExport },
    { icon: Trash2, label: 'Eliminar', onClick: onDelete, danger: true },
  ]

  return (
    <>
      <PageHeader
        title={isEditing ? 'Editar rutina' : routine?.name || 'Días'}
        onBack={() => isEditing ? onEditEnd() : navigate('/')}
        menuItems={!isEditing ? menuItems : undefined}
      >
        {isEditing && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
                Nombre
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full p-2 rounded-lg text-sm"
                style={inputStyle}
                placeholder="Nombre de la rutina"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
                Descripción
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="w-full p-2 rounded-lg text-sm resize-none"
                style={inputStyle}
                placeholder="Descripción de la rutina..."
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
                Objetivo
              </label>
              <input
                type="text"
                value={editForm.goal}
                onChange={(e) => handleFieldChange('goal', e.target.value)}
                className="w-full p-2 rounded-lg text-sm"
                style={inputStyle}
                placeholder="Ej: Hipertrofia, Fuerza..."
              />
            </div>
          </div>
        )}
      </PageHeader>
    </>
  )
}

export default RoutineHeader
