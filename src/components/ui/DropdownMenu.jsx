import { useState } from 'react'
import { MoreVertical, ChevronRight } from 'lucide-react'
import { colors, menuStyle } from '../../lib/styles.js'

function DropdownMenu({ items, triggerSize = 18, triggerClassName = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSubmenu, setExpandedSubmenu] = useState(null)

  const handleClose = () => {
    setIsOpen(false)
    setExpandedSubmenu(null)
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
          setExpandedSubmenu(null)
        }}
        className={`p-1.5 rounded-lg transition-opacity hover:opacity-80 ${triggerClassName}`}
        style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}
      >
        <MoreVertical size={triggerSize} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => { e.stopPropagation(); handleClose() }}
          />
          <div
            className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-lg min-w-[180px]"
            style={menuStyle}
          >
            {items.filter(Boolean).map((item, index) =>
              item.type === 'separator' ? (
                <div key={index} style={{ borderTop: `1px solid ${colors.border}`, margin: '4px 0' }} />
              ) : item.children ? (
                <div key={index} className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedSubmenu(expandedSubmenu === index ? null : index)
                    }}
                    disabled={item.disabled}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80 disabled:opacity-30"
                    style={{ color: colors.textPrimary }}
                  >
                    {item.icon && (
                      <item.icon size={14} style={{ color: colors.textSecondary }} />
                    )}
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronRight size={14} style={{ color: colors.textSecondary }} />
                  </button>
                  {expandedSubmenu === index && (
                    <div
                      className="absolute right-full top-0 mr-1 z-50 py-1 rounded-lg shadow-lg min-w-[120px] max-h-[200px] overflow-y-auto"
                      style={menuStyle}
                    >
                      {item.children.map((child, childIndex) => (
                        <button
                          key={childIndex}
                          onClick={(e) => {
                            e.stopPropagation()
                            child.onClick?.()
                            handleClose()
                          }}
                          disabled={child.disabled}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80 disabled:opacity-30"
                          style={{ color: child.active ? colors.accent : colors.textPrimary }}
                        >
                          {child.label}
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
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80 disabled:opacity-30"
                  style={{ color: item.danger ? colors.danger : colors.textPrimary }}
                >
                  {item.icon && (
                    <item.icon size={14} style={{ color: item.danger ? colors.danger : colors.textSecondary }} />
                  )}
                  {item.label}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default DropdownMenu
