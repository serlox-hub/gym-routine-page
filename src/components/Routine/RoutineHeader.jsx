import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Download, MoreVertical } from 'lucide-react'
import { useUpdateRoutine } from '../../hooks/useRoutines.js'
import { colors, inputStyle } from '../../lib/styles.js'
import { exportRoutine, downloadRoutineAsJson } from '../../lib/routineIO.js'

const DEBOUNCE_MS = 500

function RoutineHeader({ routine, routineId, isEditing, onEditStart, onEditEnd }) {
  const navigate = useNavigate()
  const [editForm, setEditForm] = useState({ name: '', description: '', goal: '' })
  const [showMenu, setShowMenu] = useState(false)
  const debounceRef = useRef(null)
  const updateRoutine = useUpdateRoutine()

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
      const filename = `${routine.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
      downloadRoutineAsJson(data, filename)
    } catch (err) {
      console.error('Error exportando rutina:', err)
    }
  }

  return (
    <header className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => isEditing ? onEditEnd() : navigate('/')}
            className="text-secondary hover:text-accent transition-colors"
          >
            ←
          </button>
          <h1 className="text-xl font-bold px-2">{isEditing ? 'Editar rutina' : 'Días'}</h1>
        </div>
        {!isEditing && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
            >
              <MoreVertical size={20} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-lg min-w-[140px]"
                  style={{ backgroundColor: '#21262d', border: '1px solid #30363d' }}
                >
                  <button
                    onClick={() => { onEditStart(); setShowMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-80"
                    style={{ color: '#e6edf3' }}
                  >
                    <Pencil size={16} style={{ color: '#8b949e' }} />
                    Editar
                  </button>
                  <button
                    onClick={() => { handleExport(); setShowMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:opacity-80"
                    style={{ color: '#e6edf3' }}
                  >
                    <Download size={16} style={{ color: '#8b949e' }} />
                    Exportar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

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
    </header>
  )
}

export default RoutineHeader
