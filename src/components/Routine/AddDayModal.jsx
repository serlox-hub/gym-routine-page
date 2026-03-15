import { useState } from 'react'
import { Button, Modal, Input } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function AddDayModal({ isOpen, onClose, onSubmit, nextDayNumber, isPending }) {
  const [form, setForm] = useState({
    name: '',
    estimated_duration_min: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return

    onSubmit({
      name: form.name.trim(),
      estimated_duration_min: form.estimated_duration_min ? parseInt(form.estimated_duration_min) : null,
      sort_order: nextDayNumber,
    })

    setForm({ name: '', estimated_duration_min: '' })
  }

  const handleClose = () => {
    setForm({ name: '', estimated_duration_min: '' })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
        Añadir día {nextDayNumber}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre *"
          type="text"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ej: Pecho y tríceps"
          autoFocus
        />

        <Input
          label="Duración estimada en minutos (opcional)"
          type="number"
          min="1"
          value={form.estimated_duration_min}
          onChange={(e) => setForm(prev => ({ ...prev, estimated_duration_min: e.target.value }))}
          placeholder="Ej: 60"
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!form.name.trim() || isPending}
          >
            {isPending ? 'Guardando...' : 'Añadir'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddDayModal
