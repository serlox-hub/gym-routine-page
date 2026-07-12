import { useTranslation } from 'react-i18next'
import Modal from './Modal.jsx'
import { colors } from '../../lib/styles.js'

/**
 * Bottom-sheet modal to move an item to a specific position.
 * Mirrors the native ReorderModal component.
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Called when closing the modal
 * @param {number} totalItems - Number of selectable positions
 * @param {number} currentIndex - Index of the current position (disabled)
 * @param {string[]} positionLabels - Optional label per position
 * @param {function} onSelect - Called with the selected index
 */
function ReorderModal({ isOpen, onClose, totalItems, currentIndex, positionLabels = [], onSelect }) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-lg">
      <div className="py-2 pb-6">
        <h3 className="px-5 py-3 text-base font-semibold" style={{ color: colors.textPrimary }}>
          {t('routine:moveToPosition')}
        </h3>
        <div className="max-h-[50vh] overflow-y-auto">
          {Array.from({ length: totalItems }, (_, i) => {
            const isCurrent = i === currentIndex
            const label = positionLabels[i] || t('routine:position', { number: i + 1 })
            return (
              <button
                key={i}
                onClick={() => onSelect(i)}
                disabled={isCurrent}
                className="w-full text-left px-5 py-3 text-sm hover:opacity-80 disabled:opacity-30"
                style={{ color: colors.textPrimary }}
              >
                {i + 1}. {label}{isCurrent ? ` ${t('routine:currentPosition')}` : ''}
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

export default ReorderModal
