import { colors, modalOverlayStyle, modalContentStyle } from '../../lib/styles.js'

/**
 * Base modal component that handles overlay, positioning and close behavior
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Called when clicking overlay (can be undefined to disable)
 * @param {string} position - 'center' (default) or 'bottom' for bottom sheet style
 * @param {string} maxWidth - Tailwind max-width class (default: 'max-w-sm')
 * @param {string} className - Additional classes for content container
 * @param {boolean} noBorder - If true, omits the default border
 * @param {React.ReactNode} children - Modal content
 */
function Modal({
  isOpen,
  onClose,
  children,
  position = 'center',
  maxWidth = 'max-w-sm',
  className = '',
  noBorder = false,
}) {
  if (!isOpen) return null

  const isBottom = position === 'bottom'

  const overlayClasses = isBottom
    ? 'fixed inset-0 z-50 flex items-end justify-center'
    : 'fixed inset-0 z-50 flex items-center justify-center p-4'

  const contentClasses = isBottom
    ? `w-full ${maxWidth} rounded-t-2xl ${className}`
    : `w-full ${maxWidth} rounded-lg ${className}`

  const contentStyle = noBorder
    ? modalContentStyle
    : { ...modalContentStyle, border: `1px solid ${colors.border}` }

  return (
    <div
      className={overlayClasses}
      style={modalOverlayStyle}
      onMouseDown={onClose}
    >
      <div
        className={contentClasses}
        style={contentStyle}
        onMouseDown={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export default Modal
