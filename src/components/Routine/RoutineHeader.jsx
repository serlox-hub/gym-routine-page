import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Download } from 'lucide-react'
import { useUpdateRoutine } from '../../hooks/useRoutines.js'
import { colors, inputStyle } from '../../lib/styles.js'
import { exportRoutine, downloadRoutineAsJson } from '../../lib/routineIO.js'

const DEBOUNCE_MS = 500

function RoutineHeader({ routine, routineId, isEditing, onEditStart }) {
  const navigate = useNavigate()
  const [editForm, setEditForm] = useState({ nombre: '', descripcion: '', objetivo: '' })
  const debounceRef = useRef(null)
  const updateRoutine = useUpdateRoutine()

  useEffect(() => {
    if (routine && !isEditing) {
      setEditForm({
        nombre: routine.nombre || '',
        descripcion: routine.descripcion || '',
        objetivo: routine.objetivo || '',
      })
    }
  }, [routine, isEditing])

  const saveChanges = useCallback((formData) => {
    if (!formData.nombre.trim()) return

    updateRoutine.mutate({
      routineId: parseInt(routineId),
      data: {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        objetivo: formData.objetivo.trim() || null,
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
      const filename = `${routine.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
      downloadRoutineAsJson(data, filename)
    } catch (err) {
      console.error('Error exportando rutina:', err)
    }
  }

  return (
    <header className="mb-6">
      <button
        onClick={() => navigate('/')}
        className="text-secondary hover:text-accent mb-2 transition-colors"
      >
        ← Volver
      </button>
      <div className="flex items-center justify-between gap-3">
        {isEditing ? (
          <input
            type="text"
            value={editForm.nombre}
            onChange={(e) => handleFieldChange('nombre', e.target.value)}
            className="flex-1 text-2xl font-bold p-2 rounded-lg"
            style={inputStyle}
            placeholder="Nombre de la rutina"
            autoFocus
          />
        ) : (
          <h1 className="text-2xl font-bold">{routine.nombre}</h1>
        )}
        {!isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 rounded-lg transition-opacity hover:opacity-80 shrink-0"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
              title="Exportar rutina"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onEditStart}
              className="p-2 rounded-lg transition-opacity hover:opacity-80 shrink-0"
              style={{ backgroundColor: '#21262d', color: '#8b949e' }}
              title="Editar rutina"
            >
              <Pencil size={18} />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              Descripción
            </label>
            <textarea
              value={editForm.descripcion}
              onChange={(e) => handleFieldChange('descripcion', e.target.value)}
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
              value={editForm.objetivo}
              onChange={(e) => handleFieldChange('objetivo', e.target.value)}
              className="w-full p-2 rounded-lg text-sm"
              style={inputStyle}
              placeholder="Ej: Hipertrofia, Fuerza..."
            />
          </div>
        </div>
      ) : (
        <>
          {routine.descripcion && (
            <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
              {routine.descripcion}
            </p>
          )}
          {routine.objetivo && (
            <p className="text-sm mt-1">
              <span style={{ color: colors.success }}>Objetivo:</span>{' '}
              <span style={{ color: colors.textSecondary }}>{routine.objetivo}</span>
            </p>
          )}
        </>
      )}
    </header>
  )
}

export default RoutineHeader
