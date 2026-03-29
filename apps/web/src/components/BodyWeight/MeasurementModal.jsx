import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal, Input, Textarea } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { getMeasurementLabel, parseDecimal } from '@gym/shared'

function MeasurementModal({ isOpen, onClose, onSubmit, measurementType, unit = 'cm', record = null, isPending }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    value: '',
    notes: '',
  })

  const isEditing = !!record

  useEffect(() => {
    if (isOpen) {
      if (record) {
        setForm({
          value: record.value?.toString() || '',
          notes: record.notes || '',
        })
      } else {
        setForm({ value: '', notes: '' })
      }
    }
  }, [isOpen, record])

  const handleSubmit = (e) => {
    e.preventDefault()
    const value = parseDecimal(form.value)
    if (!value || value <= 0) return

    onSubmit({
      id: record?.id,
      measurementType,
      value,
      unit,
      notes: form.notes.trim() || null,
    })
  }

  const handleClose = () => {
    setForm({ value: '', notes: '' })
    onClose()
  }

  const label = getMeasurementLabel(measurementType)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
        {isEditing ? `${t('body:measurements.edit')} ${label.toLowerCase()}` : `${t('body:measurements.record')} ${label.toLowerCase()}`}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={`${label} (${unit}) *`}
          type="number"
          step="0.1"
          min="0.1"
          max="500"
          value={form.value}
          onChange={(e) => setForm(prev => ({ ...prev, value: e.target.value }))}
          placeholder={`Ej: ${unit === 'cm' ? '85.5' : '33.5'}`}
          autoFocus
        />

        <Textarea
          label={`${t('common:labels.notes')} (${t('common:labels.optional')})`}
          value={form.notes}
          onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Ej: En ayunas"
          rows={2}
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            {t('common:buttons.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!form.value || parseDecimal(form.value) <= 0 || isPending}
          >
            {isPending ? t('common:buttons.loading') : isEditing ? t('common:buttons.save') : t('body:measurements.record')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default MeasurementModal
