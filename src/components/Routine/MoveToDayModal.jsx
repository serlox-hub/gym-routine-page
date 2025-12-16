import { useState } from 'react'
import { Modal, Button } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function MoveToDayModal({ isOpen, onClose, onSubmit, days, currentDayId, exerciseName, isPending }) {
  const [selectedDayId, setSelectedDayId] = useState(null)

  const availableDays = days?.filter(d => d.id !== currentDayId) || []

  const handleSubmit = () => {
    if (selectedDayId) {
      onSubmit(selectedDayId)
    }
  }

  const handleClose = () => {
    setSelectedDayId(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-sm">
      <div className="p-5">
        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
          Mover ejercicio
        </h3>
        <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
          Selecciona el día destino para <strong>{exerciseName}</strong>
        </p>

        {availableDays.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: colors.textSecondary }}>
            No hay otros días disponibles
          </p>
        ) : (
          <div className="space-y-2 mb-4">
            {availableDays.map(day => (
              <button
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className="w-full text-left p-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: selectedDayId === day.id ? 'rgba(88, 166, 255, 0.15)' : colors.bgTertiary,
                  border: selectedDayId === day.id ? `1px solid ${colors.accent}` : '1px solid transparent',
                  color: colors.textPrimary,
                }}
              >
                {day.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDayId || isPending}
          >
            {isPending ? 'Moviendo...' : 'Mover'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default MoveToDayModal
