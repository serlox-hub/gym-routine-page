import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Download, Trash2, Copy, ClipboardCopy } from 'lucide-react'
import { useDuplicateRoutine, useRoutineDetailsForm } from '../../hooks/useRoutines.js'
import { sanitizeFilename, exportRoutine, formatRoutineAsText, getNotifier } from '@gym/shared'
import { downloadRoutineAsJson } from '../../lib/routineIO.js'
import { ErrorMessage, Modal, PageHeader } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

export function RoutineEditForm({ routine, routineId, onClose }) {
  const { t } = useTranslation()
  const { form, setField, error, submit, isSaving } = useRoutineDetailsForm(routine, routineId)

  const handleSave = async () => {
    if (await submit()) onClose?.()
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700 }}>{t('routine:editDetails')}</h3>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
          {t('routine:name')}
        </label>
        <input
          type="text" value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder={t('routine:namePlaceholder')} autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
          {t('routine:description')}
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder={t('routine:descriptionPlaceholder')} rows={2}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, border: 'none' }}
        />
      </div>
      {error && <ErrorMessage message={error} />}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ border: `1px solid ${colors.border}`, color: colors.textPrimary }}
        >
          {t('common:buttons.cancel')}
        </button>
        <button
          onClick={handleSave} disabled={isSaving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ backgroundColor: colors.success, color: colors.bgPrimary }}
        >
          {isSaving ? t('common:buttons.loading') : t('common:buttons.save')}
        </button>
      </div>
    </div>
  )
}

function RoutineHeader({ routine, routineId, onDelete, initialDetailsOpen = false }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const duplicateRoutine = useDuplicateRoutine()
  // Una rutina recién creada llega con el nombre por defecto: se abre el modal para que no pase
  // desapercibido. Solo el valor inicial, que la pantalla limpia la señal en cuanto la lee.
  const [showDetails, setShowDetails] = useState(initialDetailsOpen)

  const handleExport = async () => {
    try {
      const data = await exportRoutine(parseInt(routineId))
      const filename = `${sanitizeFilename(routine.name)}.json`
      downloadRoutineAsJson(data, filename)
    } catch {
      getNotifier()?.show(t('routine:exportError'), 'error')
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
    // El menú se cierra al pulsar y la duplicación puede tardar (importRoutine carga el
    // catálogo de ejercicios); sin guard, un segundo tap durante la espera crea copias de más.
    if (duplicateRoutine.isPending) return
    getNotifier()?.show(t('routine:duplicating'), 'loading')
    try {
      const newRoutine = await duplicateRoutine.mutateAsync({ routineId: parseInt(routineId) })
      navigate(`/routine/${newRoutine.id}`, { replace: true })
    } catch {
      // Error notificado por el propio hook (useDuplicateRoutine)
    }
  }

  const menuItems = [
    { icon: Pencil, label: t('routine:editDetails'), onClick: () => setShowDetails(true) },
    { icon: Copy, label: t('routine:duplicate'), onClick: handleDuplicate },
    { icon: ClipboardCopy, label: t('routine:copyAsText'), onClick: handleCopyAsText },
    { icon: Download, label: t('common:buttons.export'), onClick: handleExport },
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ]

  return (
    <>
      <PageHeader
        title=""
        onBack={() => navigate(-1)}
        menuItems={menuItems}
      />
      {/* El form se monta solo mientras el modal está abierto: así se siembra una vez por
          apertura y un refetch de `routine` de fondo no pisa lo que se está escribiendo. */}
      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} position="bottom" maxWidth="max-w-lg">
        <RoutineEditForm routine={routine} routineId={routineId} onClose={() => setShowDetails(false)} />
      </Modal>
    </>
  )
}

export default RoutineHeader
