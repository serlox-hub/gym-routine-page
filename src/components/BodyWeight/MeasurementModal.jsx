import { useState, useEffect } from 'react'
import { Button } from '../ui/index.js'
import { colors, modalOverlayStyle, modalContentStyle, inputStyle } from '../../lib/styles.js'
import { getMeasurementLabel } from '../../lib/measurementConstants.js'

function MeasurementModal({ isOpen, onClose, onSubmit, measurementType, unit = 'cm', record = null, isPending }) {
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

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const value = parseFloat(form.value)
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={modalOverlayStyle}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm rounded-lg p-6"
        style={{ ...modalContentStyle, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
          {isEditing ? `Editar ${label.toLowerCase()}` : `Registrar ${label.toLowerCase()}`}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
              {label} ({unit}) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="500"
              value={form.value}
              onChange={(e) => setForm(prev => ({ ...prev, value: e.target.value }))}
              placeholder={`Ej: ${unit === 'cm' ? '85.5' : '33.5'}`}
              className="w-full p-3 rounded-lg text-base"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
              Notas (opcional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Ej: En ayunas"
              rows={2}
              className="w-full p-3 rounded-lg text-base resize-none"
              style={inputStyle}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!form.value || parseFloat(form.value) <= 0 || isPending}
            >
              {isPending ? 'Guardando...' : isEditing ? 'Guardar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MeasurementModal
