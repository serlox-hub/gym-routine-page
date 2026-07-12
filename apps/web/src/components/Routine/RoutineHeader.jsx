import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Download, Trash2, Copy, ClipboardCopy } from 'lucide-react'
import { useDuplicateRoutine, useRoutineEditForm } from '../../hooks/useRoutines.js'
import { sanitizeFilename, exportRoutine, formatRoutineAsText, getNotifier } from '@gym/shared'
import { downloadRoutineAsJson } from '../../lib/routineIO.js'
import { PageHeader } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

export function RoutineEditForm({ routine, routineId }) {
  const { t } = useTranslation()
  const { editForm, handleFieldChange } = useRoutineEditForm(routine, routineId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
          {t('routine:name')}
        </label>
        <input
          type="text" value={editForm.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder={t('routine:name')} autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
          {t('routine:description')}
        </label>
        <textarea
          value={editForm.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          placeholder={`${t('routine:description')}...`} rows={2}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }}
        />
      </div>
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

  const handleCopyAsText = async () => {
    try {
      // Safari iOS exige que la llamada al portapapeles se inicie síncrona desde
      // el click. Si hacemos `await exportRoutine` antes del writeText se pierde
      // la user activation. Por eso usamos ClipboardItem con Promise<Blob>: el
      // navegador resuelve la promesa internamente sin invalidar el gesto.
      const blobPromise = exportRoutine(parseInt(routineId))
        .then(data => new Blob([formatRoutineAsText(data)], { type: 'text/plain' }))
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blobPromise })])
      getNotifier()?.show(t('routine:copiedToClipboard'), 'success')
    } catch {
      getNotifier()?.show(t('routine:copyAsTextFailed'), 'error')
    }
  }

  const handleDuplicate = async () => {
    try {
      const newRoutine = await duplicateRoutine.mutateAsync(parseInt(routineId))
      navigate(`/routine/${newRoutine.id}`)
    } catch {
      // Error handled by mutation
    }
  }

  if (isEditing) {
    return (
      <PageHeader
        title={routine?.name || t('routine:new')}
        onBack={() => onEditEnd?.()}
      />
    )
  }

  const menuItems = [
    { icon: Pencil, label: t('common:buttons.edit'), onClick: onEditStart },
    { icon: Copy, label: t('routine:duplicate'), onClick: handleDuplicate },
    { icon: ClipboardCopy, label: t('routine:copyAsText'), onClick: handleCopyAsText },
    { icon: Download, label: t('common:buttons.export'), onClick: handleExport },
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ]

  return (
    <PageHeader
      title=""
      onBack={() => navigate(-1)}
      menuItems={menuItems}
    />
  )
}

export default RoutineHeader
