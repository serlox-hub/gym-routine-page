import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal, Input, Textarea } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { parseDecimal } from '@gym/shared'

function BodyWeightModal({ isOpen, onClose, onSubmit, record = null, isPending }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    weight: '',
    notes: '',
  })

  const isEditing = !!record

  useEffect(() => {
    if (isOpen) {
      if (record) {
        setForm({
          weight: record.weight?.toString() || '',
          notes: record.notes || '',
        })
      } else {
        setForm({ weight: '', notes: '' })
      }
    }
  }, [isOpen, record])

  const handleSubmit = (e) => {
    e.preventDefault()
    const weight = parseDecimal(form.weight)
    if (!weight || weight <= 0) return

    onSubmit({
      id: record?.id,
      weight,
      notes: form.notes.trim() || null,
    })
  }

  const handleClose = () => {
    setForm({ weight: '', notes: '' })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
        {isEditing ? t('body:weight.edit') : t('body:weight.record')}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={`${t('body:weight.kg')} *`}
          type="number"
          step="0.1"
          min="0.1"
          max="500"
          value={form.weight}
          onChange={(e) => setForm(prev => ({ ...prev, weight: e.target.value }))}
          placeholder="Ej: 75.5"
          autoFocus
        />

        <Textarea
          label={`${t('common:labels.notes')} (${t('common:labels.optional')})`}
          value={form.notes}
          onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Ej: Después de desayunar"
          rows={2}
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            {t('common:buttons.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!form.weight || parseDecimal(form.weight) <= 0 || isPending}
          >
            {isPending ? t('common:buttons.loading') : isEditing ? t('common:buttons.save') : t('body:weight.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default BodyWeightModal
