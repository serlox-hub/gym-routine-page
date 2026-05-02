import { ChevronDown, Clock, FileText, ChevronLeft } from 'lucide-react'
import { colors, RGB_SUCCESS } from '../../lib/styles.js'

function PhoneMockup({ children, className = '' }) {
  return (
    <div className={`relative mx-auto ${className}`} style={{ width: 230 }}>
      <div
        className="rounded-[2rem] p-[6px] shadow-2xl"
        style={{
          aspectRatio: '71.6 / 147.6',
          background: `linear-gradient(145deg, ${colors.border}, ${colors.bgTertiary})`,
          boxShadow: `0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(${RGB_SUCCESS}, 0.1)`,
        }}
      >
        <div className="rounded-[1.6rem] overflow-hidden h-full flex flex-col" style={{ backgroundColor: colors.bgPrimary }}>
          {/* Dynamic Island */}
          <div className="flex-shrink-0 flex justify-center pt-2 pb-1" style={{ backgroundColor: colors.bgPrimary }}>
            <div className="rounded-full" style={{ width: 72, height: 18, backgroundColor: colors.bgSecondary }} />
          </div>
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
          {/* Home indicator */}
          <div className="flex-shrink-0 flex justify-center pb-2 pt-1" style={{ backgroundColor: colors.bgPrimary }}>
            <div className="rounded-full" style={{ width: 80, height: 4, backgroundColor: colors.border }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Mockup: Routine Detail ───────────────────────────────────────
function MockupRoutineScreen() {
  return (
    <div className="px-3 pb-3 pt-1.5" style={{ backgroundColor: colors.bgPrimary }}>
      {/* Title + kebab */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] font-bold leading-tight" style={{ color: colors.textPrimary }}>Push Pull Legs</p>
        <span className="text-[9px]" style={{ color: colors.textMuted }}>•••</span>
      </div>
      <p className="text-[8px] mb-2" style={{ color: colors.textSecondary }}>Hipertrofia · 3 días/semana</p>

      {/* Day tabs */}
      <div className="flex gap-1 mb-2.5">
        {['Push', 'Pull', 'Legs'].map((day, i) => (
          <div
            key={day}
            className="flex-1 py-1 rounded text-[8px] font-semibold text-center"
            style={{
              backgroundColor: i === 0 ? colors.success : colors.bgTertiary,
              color: i === 0 ? colors.bgPrimary : colors.textSecondary,
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Block: Calentamiento */}
      <p className="text-[7px] font-bold uppercase tracking-wider mb-1" style={{ color: colors.success, letterSpacing: 0.8 }}>
        Calentamiento (2)
      </p>
      <ExerciseCard color={colors.warning} name="Movilidad articular" sets="3×10" group="Cuerpo" />
      <ExerciseCard color={colors.warning} name="Activación escápula" sets="2×12" group="Hombros" />

      {/* Block: Principal */}
      <p className="text-[7px] font-bold uppercase tracking-wider mb-1 mt-2" style={{ color: colors.success, letterSpacing: 0.8 }}>
        Principal (6)
      </p>
      <ExerciseCard color={colors.danger} name="Press Banca" sets="4×8" group="Pecho" />
      <ExerciseCard color={colors.danger} name="Press Inclinado Mancuerna" sets="3×10" group="Pecho" />
      <ExerciseCard color={colors.danger} name="Aperturas en polea" sets="3×12" group="Pecho" />
      <ExerciseCard color={colors.purple} name="Press Militar" sets="4×8" group="Hombros" />
      <ExerciseCard color={colors.purple} name="Elevaciones Laterales" sets="3×15" group="Hombros" />
      <ExerciseCard color={colors.teal} name="Fondos Paralelas" sets="3×12" group="Tríceps" />

      {/* Block: Añadido */}
      <p className="text-[7px] font-bold uppercase tracking-wider mb-1 mt-2" style={{ color: colors.success, letterSpacing: 0.8 }}>
        Añadido (1)
      </p>
      <ExerciseCard color={colors.teal} name="Extensión Tríceps Polea" sets="3×12" group="Tríceps" />
    </div>
  )
}

function ExerciseCard({ color, name, sets, group }) {
  return (
    <div
      className="mb-1 rounded relative overflow-hidden"
      style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.borderSubtle}` }}
    >
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, backgroundColor: color }} />
      <div className="pl-2 pr-1.5 py-1 text-left">
        <p className="text-[9px] font-semibold leading-tight" style={{ color: colors.textPrimary }}>{name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[7px] px-1 py-px rounded" style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary }}>{group}</span>
          <span className="text-[7px] px-1 py-px rounded" style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary }}>{sets}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Mockup: Workout Session ──────────────────────────────────────
function MockupWorkoutScreen() {
  return (
    <div className="px-2 pb-3" style={{ backgroundColor: colors.bgPrimary }}>
      {/* Header */}
      <div className="flex items-center gap-1 pt-1 mb-1.5">
        <ChevronLeft size={11} color={colors.textPrimary} />
        <p className="text-[11px] font-bold flex-1" style={{ color: colors.textPrimary }}>Día 3 · Empuje</p>
      </div>

      {/* Sticky progress */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] font-semibold" style={{ color: colors.textPrimary }}>Ejercicio 2 de 4</span>
          <span className="text-[7px]" style={{ color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>18:42</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: colors.bgTertiary }}>
          <div className="h-full rounded-full" style={{ width: '42%', backgroundColor: colors.success }} />
        </div>
      </div>

      {/* Block label */}
      <p className="text-[7px] font-bold uppercase tracking-wider mb-1" style={{ color: colors.success, letterSpacing: 0.8 }}>
        Principal (4)
      </p>

      {/* Exercise card open */}
      <div
        className="rounded-md relative mb-1.5"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, paddingLeft: 6 }}
      >
        <div className="absolute left-0 top-2 w-[3px] rounded-r" style={{ height: 24, backgroundColor: colors.danger }} />
        {/* Title row */}
        <div className="flex items-center justify-between px-1.5 py-1.5">
          <p className="text-[9px] font-bold leading-tight" style={{ color: colors.textPrimary }}>Press Banca</p>
          <span className="text-[8px]" style={{ color: colors.textMuted }}>•••</span>
        </div>
        {/* Pills */}
        <div className="flex items-center gap-1 px-1.5 pb-1.5">
          <span className="text-[7px] px-1 py-px rounded" style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary }}>Pecho</span>
          <span className="text-[7px] px-1 py-px rounded" style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary }}>4 × 8 · @2</span>
          <span className="text-[7px] px-1 py-px rounded" style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary }}>120s</span>
        </div>
        {/* Notes toggle */}
        <div className="mx-1.5 mb-1.5 flex items-center gap-1 rounded px-1.5 py-1" style={{ backgroundColor: colors.bgAlt }}>
          <FileText size={8} color={colors.textSecondary} />
          <span className="text-[7px] flex-1" style={{ color: colors.textSecondary }}>Notas y consejos</span>
          <ChevronDown size={8} color={colors.textSecondary} />
        </div>
        {/* Previous session */}
        <div className="mx-1.5 mb-1.5 rounded p-1.5" style={{ backgroundColor: colors.bgAlt }}>
          <div className="flex items-center gap-1 mb-1">
            <Clock size={7} color={colors.textSecondary} />
            <span className="text-[6px]" style={{ color: colors.textSecondary }}>Última sesión · hace 3 días</span>
          </div>
          <div className="flex gap-1">
            {[
              { v: '80×8', rir: '@3' },
              { v: '82.5×8', rir: '@2' },
              { v: '82.5×7', rir: '@1' },
              { v: '80×6', rir: '@1' },
            ].map((s, i) => (
              <div key={i} className="flex-1 rounded text-center py-0.5" style={{ backgroundColor: colors.border }}>
                <p className="text-[7px] font-semibold" style={{ color: colors.textPrimary }}>{s.v}</p>
                <p className="text-[5px]" style={{ color: colors.textMuted }}>{s.rir}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Column headers */}
        <div className="flex items-center px-1.5 mb-0.5 text-[6px] font-semibold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
          <span className="w-5 text-center">Set</span>
          <span className="flex-1 text-center">Kg</span>
          <span className="flex-1 text-center">Reps</span>
          <span className="w-12" />
        </div>
        {/* Set rows */}
        {[
          { n: 1, kg: '80', reps: '8', state: 'done', rir: '@2' },
          { n: 2, kg: '82.5', reps: '8', state: 'done', rir: '@2' },
          { n: 3, kg: '85', reps: '—', state: 'active' },
          { n: 4, kg: '85', reps: '8', state: 'pending' },
        ].map((row) => (
          <div
            key={row.n}
            className="flex items-center px-1.5 py-1 rounded mx-0.5 text-[8px]"
            style={{
              backgroundColor: row.state === 'active' ? colors.successBg : 'transparent',
              opacity: row.state === 'pending' ? 0.55 : 1,
            }}
          >
            <span className="w-5 text-center font-bold" style={{ color: row.state === 'active' ? colors.success : colors.textSecondary }}>{row.n}</span>
            {row.state === 'active' ? (
              <>
                <span className="flex-1 text-center font-semibold rounded mx-0.5 py-px" style={{ color: colors.textPrimary, border: `1px solid ${colors.success}`, backgroundColor: colors.bgSecondary }}>{row.kg}</span>
                <span className="flex-1 text-center font-semibold rounded mx-0.5 py-px" style={{ color: colors.textMuted, backgroundColor: colors.bgSecondary }}>{row.reps}</span>
              </>
            ) : (
              <>
                <span className="flex-1 text-center font-semibold" style={{ color: colors.textPrimary }}>{row.kg}</span>
                <span className="flex-1 text-center font-semibold" style={{ color: colors.textPrimary }}>{row.reps}</span>
              </>
            )}
            <div className="w-12 flex items-center justify-end gap-0.5">
              {row.state === 'done' && (
                <>
                  <span className="text-[6px] px-1 rounded" style={{ backgroundColor: colors.bgTertiary, color: colors.textSecondary }}>{row.rir}</span>
                  <span className="rounded-full flex items-center justify-center" style={{ width: 12, height: 12, backgroundColor: colors.success }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={colors.bgPrimary} strokeWidth="3.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </>
              )}
              {row.state === 'active' && (
                <span className="rounded-full" style={{ width: 12, height: 12, border: `1.5px solid ${colors.success}` }} />
              )}
              {row.state === 'pending' && (
                <span className="rounded-full" style={{ width: 12, height: 12, border: `1.5px solid ${colors.textMuted}` }} />
              )}
            </div>
          </div>
        ))}
        <div className="h-1.5" />
      </div>

      {/* Collapsed exercise cards */}
      <CollapsedExerciseCard color={colors.danger} name="Press Inclinado Mancuerna" sets="3 × 10 · @2" rest="120s" />
      <CollapsedExerciseCard color={colors.danger} name="Aperturas en polea" sets="3 × 12" rest="90s" />
      <CollapsedExerciseCard color={colors.purple} name="Press Militar" sets="4 × 8 · @2" rest="120s" />
      <CollapsedExerciseCard color={colors.teal} name="Fondos Paralelas" sets="3 × 12" rest="90s" />

      {/* Finish button */}
      <div className="mt-2 rounded text-center py-1" style={{ border: `1px solid ${colors.success}` }}>
        <span className="text-[8px] font-semibold" style={{ color: colors.success }}>⚑ Terminar entrenamiento</span>
      </div>
    </div>
  )
}

function CollapsedExerciseCard({ color, name, sets, rest }) {
  return (
    <div
      className="mb-1 rounded-md relative flex items-center"
      style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, paddingLeft: 6 }}
    >
      <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r" style={{ backgroundColor: color }} />
      <div className="flex-1 px-1.5 py-1.5">
        <p className="text-[8px] font-semibold leading-tight" style={{ color: colors.textPrimary }} >{name}</p>
        <div className="flex gap-1 mt-0.5">
          <span className="text-[6px] px-1 py-px rounded" style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary }}>{sets}</span>
          <span className="text-[6px] px-1 py-px rounded" style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary }}>{rest}</span>
        </div>
      </div>
      <ChevronDown size={10} color={colors.textMuted} className="mr-1.5" />
    </div>
  )
}

// ─── Mockup: Exercise Progress ────────────────────────────────────
function MockupProgressScreen() {
  return (
    <div className="px-3 pb-3 pt-1" style={{ backgroundColor: colors.bgPrimary }}>
      <div className="flex items-center gap-1 mb-1">
        <ChevronLeft size={11} color={colors.textPrimary} />
        <p className="text-[11px] font-bold flex-1" style={{ color: colors.textPrimary }}>Press Banca</p>
      </div>
      <p className="text-[7px] mb-2" style={{ color: colors.textSecondary }}>Progreso · últimos 3 meses</p>

      {/* Range tabs */}
      <div className="flex gap-1 mb-2 p-0.5 rounded" style={{ backgroundColor: colors.bgTertiary }}>
        {['1m', '3m', '6m', '1y'].map((r, i) => (
          <div
            key={r}
            className="flex-1 py-0.5 rounded text-[7px] font-semibold text-center"
            style={{
              backgroundColor: i === 1 ? colors.success : 'transparent',
              color: i === 1 ? colors.bgPrimary : colors.textSecondary,
            }}
          >
            {r}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded p-2 mb-2" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.borderSubtle}` }}>
        <svg viewBox="0 0 240 100" className="w-full">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.success} stopOpacity="0.3" />
              <stop offset="100%" stopColor={colors.success} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[20, 40, 60, 80].map((y) => (
            <line key={y} x1="0" y1={y} x2="240" y2={y} stroke={colors.borderSubtle} strokeWidth="0.5" strokeDasharray="2,3" />
          ))}
          <path d="M0,85 L30,78 L60,72 L90,65 L120,58 L150,48 L180,42 L210,35 L240,25 L240,100 L0,100Z" fill="url(#chartGrad)" />
          <path d="M0,85 L30,78 L60,72 L90,65 L120,58 L150,48 L180,42 L210,35 L240,25" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {[
            [0, 85], [30, 78], [60, 72], [90, 65], [120, 58], [150, 48], [180, 42], [210, 35], [240, 25],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill={colors.bgPrimary} stroke={colors.success} strokeWidth="1.5" />
          ))}
        </svg>
        <div className="flex justify-between mt-1 text-[6px]" style={{ color: colors.textMuted }}>
          <span>Dic</span><span>Ene</span><span>Feb</span><span>Mar</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        {[
          { label: 'Mejor 1RM', value: '102.5kg' },
          { label: 'Máx peso', value: '90kg' },
          { label: 'Volumen', value: '12.4k' },
        ].map((stat) => (
          <div key={stat.label} className="rounded p-1 text-center" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.borderSubtle}` }}>
            <p className="text-[6px]" style={{ color: colors.textMuted }}>{stat.label}</p>
            <p className="text-[9px] font-bold mt-0.5" style={{ color: colors.textPrimary }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* PR list */}
      <p className="text-[7px] font-semibold mb-1" style={{ color: colors.textSecondary }}>Récords personales</p>
      <div className="grid grid-cols-2 gap-1 mb-2">
        {[
          { label: '1RM', value: '102.5kg', date: '8 Mar' },
          { label: 'Mejor reps', value: '12 @ 80kg', date: '4 Mar' },
          { label: 'Mejor volumen', value: '2.4k kg', date: '8 Mar' },
          { label: 'Mejor serie', value: '90 × 6', date: '24 Feb' },
        ].map(pr => (
          <div key={pr.label} className="rounded p-1" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.borderSubtle}` }}>
            <p className="text-[6px]" style={{ color: colors.textMuted }}>{pr.label}</p>
            <p className="text-[8px] font-bold" style={{ color: colors.success }}>{pr.value}</p>
            <p className="text-[6px]" style={{ color: colors.textMuted }}>{pr.date}</p>
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      <p className="text-[7px] font-semibold mb-1" style={{ color: colors.textSecondary }}>Últimas sesiones</p>
      {[
        { date: '8 Mar', best: '87.5×8', volume: '2.4k' },
        { date: '4 Mar', best: '85×8', volume: '2.3k' },
        { date: '28 Feb', best: '85×7', volume: '2.1k' },
        { date: '24 Feb', best: '82.5×8', volume: '2.2k' },
        { date: '20 Feb', best: '82.5×7', volume: '2.0k' },
        { date: '16 Feb', best: '80×8', volume: '1.9k' },
      ].map((session) => (
        <div key={session.date} className="flex justify-between items-center py-0.5 text-[7px]" style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
          <span style={{ color: colors.textSecondary }}>{session.date}</span>
          <div className="flex gap-2">
            <span style={{ color: colors.textPrimary }}>{session.best}</span>
            <span style={{ color: colors.textMuted }}>{session.volume}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PhoneMockup
export { MockupRoutineScreen, MockupWorkoutScreen, MockupProgressScreen }
