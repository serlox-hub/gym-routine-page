import { colors } from '../../lib/styles.js'
import { Input } from '../ui/index.js'

function DayEditForm({ dayNumber, form, setForm, onSave }) {
  return (
    <div className="space-y-2" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-3">
        <span className="text-accent font-semibold shrink-0">{dayNumber}</span>
        <Input
          type="text"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          className="flex-1 min-w-0"
          placeholder="Nombre del día"
          autoFocus
        />
      </div>
      <div className="flex items-center gap-2 pl-8">
        <label className="text-sm" style={{ color: colors.textSecondary }}>
          Duración estimada:
        </label>
        <Input
          type="number"
          value={form.duration}
          onChange={(e) => setForm(prev => ({ ...prev, duration: e.target.value }))}
          className="w-16"
          placeholder="--"
          min="1"
        />
        <span className="text-sm" style={{ color: colors.textSecondary }}>min</span>
        <button
          onClick={onSave}
          className="ml-auto px-3 py-1 rounded text-sm"
          style={{ backgroundColor: colors.accent, color: colors.white }}
        >
          OK
        </button>
      </div>
    </div>
  )
}

export default DayEditForm
