import { useState, useEffect } from 'react'
import { Modal, Input } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { ArrowRightLeft } from 'lucide-react'
import { convertWeight, getWeightUnits, toggleWeightMode } from '@gym/shared'

function WeightConverterModal({ isOpen, onClose }) {
  const [value, setValue] = useState('')
  const [mode, setMode] = useState('lb-to-kg')

  useEffect(() => {
    if (isOpen) setValue('')
  }, [isOpen])

  const converted = convertWeight(value, mode)
  const hasValue = converted !== null
  const { from: fromUnit, to: toUnit } = getWeightUnits(mode)

  const handleToggle = () => {
    setMode(m => toggleWeightMode(m))
    setValue('')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-4">
        <h3 className="text-base font-semibold mb-4" style={{ color: colors.textPrimary }}>
          Conversor de peso
        </h3>

        <div className="flex items-end gap-2 mb-4">
          <Input
            autoFocus
            label={`Valor (${fromUnit})`}
            type="number"
            inputMode="decimal"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0"
            className="flex-1"
          />
          <button
            onClick={handleToggle}
            className="p-2 rounded-lg mb-px"
            style={{ backgroundColor: colors.bgTertiary }}
            title="Cambiar dirección"
          >
            <ArrowRightLeft size={20} color={colors.accent} />
          </button>
        </div>

        <div
          className="text-center py-3 rounded-lg"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <span className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
            {hasValue ? converted : '—'}
          </span>
          {hasValue && (
            <span className="text-sm ml-1" style={{ color: colors.textSecondary }}>
              {toUnit}
            </span>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default WeightConverterModal
