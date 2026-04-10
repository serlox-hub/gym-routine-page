import { useState } from 'react'
import { MoreVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import Modal from './Modal.jsx'

const ITEM_CLASS = 'w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:opacity-80 disabled:opacity-30'

function DropdownMenu({ items, triggerSize = 18, triggerClassName = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSubmenu, setExpandedSubmenu] = useState(null)

  const handleClose = () => {
    setIsOpen(false)
    setExpandedSubmenu(null)
  }

  const filteredItems = items.filter(Boolean)

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        className={`p-1.5 rounded-lg transition-opacity hover:opacity-80 ${triggerClassName}`}
        style={{ color: colors.textPrimary }}
      >
        <MoreVertical size={triggerSize} />
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} position="bottom" maxWidth="max-w-lg">
        <div className="py-2 pb-6">
          {filteredItems.map((item, index) =>
            item.type === 'separator' ? (
              <div key={index} className="my-1" style={{ borderTop: `1px solid ${colors.border}` }} />
            ) : item.children ? (
              <div key={index}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedSubmenu(expandedSubmenu === index ? null : index)
                  }}
                  disabled={item.disabled}
                  className={ITEM_CLASS}
                  style={{ color: colors.textPrimary }}
                >
                  {item.icon && <item.icon size={18} style={{ color: colors.textSecondary }} />}
                  <span className="flex-1 text-left">{item.label}</span>
                  {expandedSubmenu === index
                    ? <ChevronUp size={16} style={{ color: colors.textSecondary }} />
                    : <ChevronDown size={16} style={{ color: colors.textSecondary }} />
                  }
                </button>
                {expandedSubmenu === index && (
                  <div className="max-h-[200px] overflow-y-auto" style={{ backgroundColor: colors.bgPrimary }}>
                    {item.children.map((child, childIndex) => (
                      <button
                        key={childIndex}
                        onClick={(e) => {
                          e.stopPropagation()
                          child.onClick?.()
                          handleClose()
                        }}
                        disabled={child.disabled}
                        className="w-full flex items-center gap-3 px-8 py-2.5 text-sm transition-colors hover:opacity-80 disabled:opacity-30"
                        style={{ color: child.active ? colors.accent : colors.textPrimary }}
                      >
                        <span className="truncate">{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  item.onClick?.()
                  handleClose()
                }}
                disabled={item.disabled}
                className={ITEM_CLASS}
                style={{ color: item.danger ? colors.danger : item.accent ? colors.success : colors.textPrimary }}
              >
                {item.icon && <item.icon size={18} style={{ color: item.danger ? colors.danger : item.accent ? colors.success : colors.textSecondary }} />}
                {item.label}
              </button>
            )
          )}
        </div>
      </Modal>
    </>
  )
}

export default DropdownMenu
