import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRightLeft, X } from 'lucide-react'
import { Modal } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { convertWeight, getWeightUnits, toggleWeightMode } from '@gym/shared'

const RATIO_TEXTS = {
  'kg-to-lb': '1 kg = 2.205 lb',
  'lb-to-kg': '1 lb = 0.454 kg',
}

function WeightConverterModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [mode, setMode] = useState('kg-to-lb')

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

  const labelStyle = { color: colors.textSecondary, fontSize: 10, fontWeight: 600, letterSpacing: 0.8 }
  const boxBaseStyle = { backgroundColor: colors.bgTertiary, borderRadius: 8, padding: '8px 10px' }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
            {t('workout:set.weightConverter')}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:opacity-80"
            style={{ backgroundColor: colors.bgTertiary, border: 'none', cursor: 'pointer' }}
            aria-label="Close"
          >
            <X size={14} color={colors.textSecondary} />
          </button>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1 flex flex-col items-center">
            <span className="uppercase mb-1" style={labelStyle}>{fromUnit}</span>
            <div className="w-full" style={{ ...boxBaseStyle, border: `2px solid ${colors.success}` }}>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="0"
                className="w-full text-center bg-transparent outline-none"
                style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700 }}
              />
            </div>
          </div>

          <button
            onClick={handleToggle}
            className="rounded-full p-1.5 mb-1.5 hover:opacity-80"
            style={{ backgroundColor: colors.bgTertiary, border: 'none', cursor: 'pointer' }}
            title={t('common:buttons.change')}
          >
            <ArrowRightLeft size={14} color={colors.success} />
          </button>

          <div className="flex-1 flex flex-col items-center">
            <span className="uppercase mb-1" style={labelStyle}>{toUnit}</span>
            <div className="w-full" style={boxBaseStyle}>
              <span className="block text-center" style={{ color: hasValue ? colors.textSecondary : colors.textMuted, fontSize: 18, fontWeight: 700 }}>
                {hasValue ? converted : '—'}
              </span>
            </div>
          </div>
        </div>

        <p className="text-center mt-3" style={{ color: colors.textMuted, fontSize: 11 }}>
          {RATIO_TEXTS[mode]}
        </p>
      </div>
    </Modal>
  )
}

export default WeightConverterModal
