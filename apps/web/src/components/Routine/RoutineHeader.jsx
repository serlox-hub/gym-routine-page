import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Download, Trash2, Copy } from 'lucide-react'
import { useDuplicateRoutine, useRoutineEditForm } from '../../hooks/useRoutines.js'
import { sanitizeFilename, exportRoutine } from '@gym/shared'
import { downloadRoutineAsJson } from '../../lib/routineIO.js'
import { PageHeader, Input, Textarea } from '../ui/index.js'

export function RoutineEditForm({ routine, routineId }) {
  const { t } = useTranslation()
  const { editForm, handleFieldChange } = useRoutineEditForm(routine, routineId)

  return (
    <div className="space-y-3 mb-4">
      <Input
        label={t('routine:name')}
        type="text"
        value={editForm.name}
        onChange={(e) => handleFieldChange('name', e.target.value)}
        placeholder={t('routine:name')}
        autoFocus
      />
      <Textarea
        label={t('routine:description')}
        value={editForm.description}
        onChange={(e) => handleFieldChange('description', e.target.value)}
        placeholder={`${t('routine:description')}...`}
        rows={2}
      />
      <Input
        label={t('routine:goal')}
        type="text"
        value={editForm.goal}
        onChange={(e) => handleFieldChange('goal', e.target.value)}
        placeholder={t('routine:goalPlaceholder')}
      />
      <Input
        label={t('routine:cycleDays')}
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
  const { t } = useTranslation()
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
    { icon: Pencil, label: t('common:buttons.edit'), onClick: onEditStart, accent: true },
    { icon: Copy, label: t('routine:duplicate'), onClick: handleDuplicate },
    { icon: Download, label: t('common:buttons.export'), onClick: handleExport },
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ]

  const editMenuItems = [
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ]

  return (
    <PageHeader
      title={isEditing ? t('routine:edit') : ''}
      onBack={() => isEditing ? onEditEnd() : navigate('/')}
      menuItems={isEditing ? editMenuItems : menuItems}
    />
  )
}

export default RoutineHeader
