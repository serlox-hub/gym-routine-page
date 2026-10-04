import { colors } from '../../lib/styles.js'
import { Modal } from '../ui/index.js'

const optionStyle = isSelected => ({
  backgroundColor: isSelected ? colors.successBgSubtle : colors.bgTertiary,
  color: isSelected ? colors.success : colors.textPrimary,
  border: `1px solid ${isSelected ? colors.success : 'transparent'}`,
})

/**
 * Every option of one filter at once, in two columns, so none hides past an edge. "All" first,
 * then the sections (`getSectionTitle` names them; without it they go untitled). Picking closes it.
 */
function FilterOptionSheet({
  isOpen, onClose, title, allLabel, sections, getSectionTitle, getOptionDot, selectedId, onSelect,
}) {
  const pick = id => {
    onSelect(id)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} position="bottom" maxWidth="max-w-md">
      <div className="px-4 pt-2 pb-8 flex flex-col min-h-0">
        <h3 className="min-h-11 flex items-center text-sm font-semibold" style={{ color: colors.textPrimary }}>
          {title}
        </h3>
        <div className="overflow-y-auto min-h-0 px-1 -mx-1">
          <button
            type="button"
            onClick={() => pick(null)}
            aria-pressed={selectedId == null}
            className="w-full min-h-11 px-3 rounded-lg text-sm text-left"
            style={optionStyle(selectedId == null)}
          >
            {allLabel}
          </button>
          {sections.map(section => (
            <div key={section.key} className="mt-3">
              {getSectionTitle && (
                <p className="text-xs font-medium mb-1.5" style={{ color: colors.textSecondary }}>
                  {getSectionTitle(section.key)}
                </p>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                {section.options.map(option => {
                  const dot = getOptionDot?.(option)
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => pick(option.id)}
                      aria-pressed={selectedId === option.id}
                      className="min-w-0 min-h-11 px-3 flex items-center gap-2 rounded-lg text-sm text-left"
                      style={optionStyle(selectedId === option.id)}
                    >
                      {dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />}
                      <span className="truncate">{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default FilterOptionSheet
