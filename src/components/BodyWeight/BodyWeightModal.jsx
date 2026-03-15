import { useState, useEffect } from 'react'
import { Button, Modal, Input, Textarea } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function BodyWeightModal({ isOpen, onClose, onSubmit, record = null, isPending }) {
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
    const weight = parseFloat(form.weight)
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
        {isEditing ? 'Editar peso' : 'Registrar peso'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Peso (kg) *"
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
          label="Notas (opcional)"
          value={form.notes}
          onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Ej: Después de desayunar"
          rows={2}
        />

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!form.weight || parseFloat(form.weight) <= 0 || isPending}
          >
            {isPending ? 'Guardando...' : isEditing ? 'Guardar' : 'Registrar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default BodyWeightModal
