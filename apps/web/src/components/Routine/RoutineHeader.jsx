import { useNavigate } from 'react-router-dom'
import { Pencil, Download, Trash2, Copy } from 'lucide-react'
import { useDuplicateRoutine, useRoutineEditForm } from '../../hooks/useRoutines.js'
import { sanitizeFilename, exportRoutine } from '@gym/shared'
import { downloadRoutineAsJson } from '../../lib/routineIO.js'
import { PageHeader, Input, Textarea } from '../ui/index.js'

export function RoutineEditForm({ routine, routineId }) {
  const { editForm, handleFieldChange } = useRoutineEditForm(routine, routineId)

  return (
    <div className="space-y-3 mb-4">
      <Input
        label="Nombre"
        type="text"
        value={editForm.name}
        onChange={(e) => handleFieldChange('name', e.target.value)}
        placeholder="Nombre de la rutina"
        autoFocus
      />
      <Textarea
        label="Descripción"
        value={editForm.description}
        onChange={(e) => handleFieldChange('description', e.target.value)}
        placeholder="Descripción de la rutina..."
        rows={2}
      />
      <Input
        label="Objetivo"
        type="text"
        value={editForm.goal}
        onChange={(e) => handleFieldChange('goal', e.target.value)}
        placeholder="Ej: Hipertrofia, Fuerza..."
      />
      <Input
        label="La rutina se repite cada (días)"
        type="number"
        value={editForm.cycle_days}
        onChange={(e) => handleFieldChange('cycle_days', e.target.value)}
        min={1}
        max={30}
        placeholder="7"
      />
    </div>
  )
}

function RoutineHeader({ routine, routineId, isEditing, onEditStart, onEditEnd, onDelete }) {
  const navigate = useNavigate()
  const duplicateRoutine = useDuplicateRoutine()

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
    <PageHeader
      title={isEditing ? 'Editar rutina' : routine?.name || 'Días'}
      onBack={() => isEditing ? onEditEnd() : navigate('/')}
      menuItems={!isEditing ? menuItems : undefined}
    />
  )
}

export default RoutineHeader
