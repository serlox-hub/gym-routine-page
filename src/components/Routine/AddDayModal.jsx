import { useState } from 'react'
import { Button } from '../ui/index.js'
import { colors, modalOverlayStyle, modalContentStyle, inputStyle } from '../../lib/styles.js'

function AddDayModal({ isOpen, onClose, onSubmit, nextDayNumber, isPending }) {
  const [form, setForm] = useState({
    nombre: '',
    duracion_estimada_min: '',
  })

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return

    onSubmit({
      nombre: form.nombre.trim(),
      duracion_estimada_min: form.duracion_estimada_min ? parseInt(form.duracion_estimada_min) : null,
      orden: nextDayNumber,
    })

    setForm({ nombre: '', duracion_estimada_min: '' })
  }

  const handleClose = () => {
    setForm({ nombre: '', duracion_estimada_min: '' })
    onClose()
  }

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
          Añadir día {nextDayNumber}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
              Nombre *
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej: Pecho y tríceps"
              className="w-full p-3 rounded-lg text-base"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
              Duración estimada en minutos (opcional)
            </label>
            <input
              type="number"
              min="1"
              value={form.duracion_estimada_min}
              onChange={(e) => setForm(prev => ({ ...prev, duracion_estimada_min: e.target.value }))}
              placeholder="Ej: 60"
              className="w-full p-3 rounded-lg text-base"
              style={inputStyle}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!form.nombre.trim() || isPending}
            >
              {isPending ? 'Guardando...' : 'Añadir'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddDayModal
