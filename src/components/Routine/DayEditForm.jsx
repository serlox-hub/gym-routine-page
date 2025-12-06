import { colors, inputStyle } from '../../lib/styles.js'

function DayEditForm({ dayNumber, form, setForm, onSave }) {
  return (
    <div className="space-y-2" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-3">
        <span className="text-accent font-semibold shrink-0">{dayNumber}</span>
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
          className="flex-1 font-medium p-1 rounded min-w-0"
          style={inputStyle}
          placeholder="Nombre del día"
          autoFocus
        />
      </div>
      <div className="flex items-center gap-2 pl-8">
        <label className="text-sm" style={{ color: colors.textSecondary }}>
          Duración estimada:
        </label>
        <input
          type="number"
          value={form.duracion}
          onChange={(e) => setForm(prev => ({ ...prev, duracion: e.target.value }))}
          className="w-16 p-1 rounded text-sm text-center"
          style={inputStyle}
          placeholder="--"
          min="1"
        />
        <span className="text-sm" style={{ color: colors.textSecondary }}>min</span>
        <button
          onClick={onSave}
          className="ml-auto px-3 py-1 rounded text-sm"
          style={{ backgroundColor: colors.accent, color: '#fff' }}
        >
          OK
        </button>
      </div>
    </div>
  )
}

export default DayEditForm
