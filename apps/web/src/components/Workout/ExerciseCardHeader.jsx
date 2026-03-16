import { DropdownMenu } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function ExerciseCardHeader({
  exerciseName,
  completedCount,
  setsCount,
  isCompleted,
  collapsed,
  onToggleCollapse,
  menuItems,
}) {
  return (
    <div
      className="flex justify-between items-start gap-2"
      onClick={onToggleCollapse}
      style={{ cursor: 'pointer' }}
    >
      <span className="text-xs" style={{ color: colors.textSecondary }}>{collapsed ? '▶' : '▼'}</span>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium" style={collapsed ? { opacity: 0.7 } : undefined}>{exerciseName}</h4>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="text-sm font-medium px-2 py-0.5 rounded"
          style={{
            backgroundColor: isCompleted ? 'rgba(63, 185, 80, 0.15)' : 'rgba(88, 166, 255, 0.15)',
            color: isCompleted ? colors.success : colors.accent,
          }}
        >
          {completedCount}/{setsCount}
        </span>
        {!collapsed && (
          <DropdownMenu
            triggerSize={16}
            items={menuItems}
          />
        )}
      </div>
    </div>
  )
}

export default ExerciseCardHeader
