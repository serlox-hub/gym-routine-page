import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { colors, menuStyle } from '../../lib/styles.js'

function DropdownMenu({ items, triggerSize = 18, triggerClassName = '' }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
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
            onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
          />
          <div
            className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg shadow-lg min-w-[140px]"
            style={menuStyle}
          >
            {items.map((item, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  item.onClick?.()
                  setIsOpen(false)
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
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default DropdownMenu
