import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { Button, Modal } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { getOrderedMeasurementTypes, getMeasurementLabel } from '../../lib/measurementConstants.js'

function MeasurementConfigModal({ isOpen, onClose, enabledMeasurements = [], onSave, isPending }) {
  const [selected, setSelected] = useState(new Set())
  const allTypes = getOrderedMeasurementTypes()

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(enabledMeasurements))
    }
  }, [isOpen, enabledMeasurements])

  const toggleMeasurement = (type) => {
    const newSelected = new Set(selected)
    if (newSelected.has(type)) {
      newSelected.delete(type)
    } else {
      newSelected.add(type)
    }
    setSelected(newSelected)
  }

  const handleSave = () => {
    onSave([...selected])
  }

  const hasChanges = () => {
    if (selected.size !== enabledMeasurements.length) return true
    return [...selected].some(type => !enabledMeasurements.includes(type))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="overflow-hidden">
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
          Configurar medidas
        </h3>
        <button onClick={onClose} className="p-1 rounded hover:opacity-80">
          <X size={20} style={{ color: colors.textSecondary }} />
        </button>
      </div>

      <div className="p-4 max-h-80 overflow-y-auto">
        <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
          Selecciona las medidas que quieres trackear
        </p>

        <div className="space-y-2">
          {allTypes.map(type => (
            <button
              key={type}
              onClick={() => toggleMeasurement(type)}
              className="w-full flex items-center gap-3 p-3 rounded-lg transition-colors"
              style={{
                backgroundColor: selected.has(type) ? 'rgba(63, 185, 80, 0.15)' : colors.bgTertiary,
                border: `1px solid ${selected.has(type) ? colors.success : 'transparent'}`,
              }}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: selected.has(type) ? colors.success : colors.bgSecondary,
                  border: selected.has(type) ? 'none' : `1px solid ${colors.border}`,
                }}
              >
                {selected.has(type) && <Check size={14} style={{ color: '#fff' }} />}
              </div>
              <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                {getMeasurementLabel(type)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex gap-3" style={{ borderTop: `1px solid ${colors.border}` }}>
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          className="flex-1"
          onClick={handleSave}
          disabled={!hasChanges() || isPending}
        >
          {isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </Modal>
  )
}

export default MeasurementConfigModal
