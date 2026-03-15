import { ChevronRight } from 'lucide-react'
import { colors } from '../../lib/styles.js'

function PhoneMockup({ children, className = '' }) {
  return (
    <div className={`relative mx-auto ${className}`} style={{ width: 230 }}>
      <div
        className="rounded-[2rem] p-[6px] shadow-2xl"
        style={{
          aspectRatio: '71.6 / 147.6',
          background: `linear-gradient(145deg, ${colors.border}, ${colors.bgTertiary})`,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(88, 166, 255, 0.1)',
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

function MockupRoutineScreen() {
  return (
    <div className="px-2.5 pb-3" style={{ backgroundColor: colors.bgPrimary }}>
      <div className="flex items-center justify-between mb-2 pt-1">
        <p className="text-[11px] font-bold" style={{ color: colors.textPrimary }}>Push - Pull - Legs</p>
        <div className="w-5 h-5 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2">
            <path d="M12 5v.01M12 12v.01M12 19v.01" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {/* Day tabs */}
      <div className="flex gap-1 mb-2.5 overflow-hidden">
        {['Push', 'Pull', 'Legs'].map((day, i) => (
          <div
            key={day}
            className="px-2 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap"
            style={{
              backgroundColor: i === 0 ? 'rgba(88, 166, 255, 0.15)' : colors.bgTertiary,
              color: i === 0 ? colors.accent : colors.textSecondary,
              border: i === 0 ? '1px solid rgba(88, 166, 255, 0.3)' : '1px solid transparent',
            }}
          >
            {day}
          </div>
        ))}
      </div>
      {/* Exercise cards */}
      {[
        { name: 'Press Banca', sets: '4×8', color: colors.danger, group: 'Pecho' },
        { name: 'Press Inclinado', sets: '3×10', color: colors.danger, group: 'Pecho' },
        { name: 'Aperturas Mancuerna', sets: '3×12', color: colors.danger, group: 'Pecho' },
        { name: 'Press Militar', sets: '4×8', color: colors.purple, group: 'Hombros' },
        { name: 'Elevaciones Laterales', sets: '3×15', color: colors.purple, group: 'Hombros' },
        { name: 'Fondos Paralelas', sets: '3×12', color: colors.teal, group: 'Tríceps' },
        { name: 'Extensión Tríceps', sets: '3×12', color: colors.teal, group: 'Tríceps' },
        { name: 'Press Francés', sets: '3×10', color: colors.teal, group: 'Tríceps' },
      ].map((exercise) => (
        <div
          key={exercise.name}
          className="mb-1.5 rounded-lg relative overflow-hidden"
          style={{ backgroundColor: colors.bgSecondary }}
        >
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{ width: 3, backgroundColor: exercise.color }}
          />
          <div className="pl-2.5 pr-2 py-1.5 text-left">
            <p className="text-[10px] font-medium leading-tight" style={{ color: colors.textPrimary }}>{exercise.name}</p>
            <p className="text-[8px] mt-0.5 leading-tight" style={{ color: colors.textSecondary }}>
              {exercise.group} — {exercise.sets} series
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function MockupWorkoutScreen() {
  return (
    <div className="px-2.5 pb-3" style={{ backgroundColor: colors.bgPrimary }}>
      {/* Header */}
      <div className="flex items-center justify-between pt-1 mb-2">
        <p className="text-[11px] font-bold" style={{ color: colors.textPrimary }}>Sesión activa</p>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.bgTertiary, color: colors.success }}>
          42:15
        </span>
      </div>
      {/* Current exercise */}
      <div className="mb-2.5 p-2 rounded-lg" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
        <p className="text-[10px] font-medium mb-0.5" style={{ color: colors.textPrimary }}>Press Banca</p>
        <p className="text-[8px] mb-2" style={{ color: colors.textSecondary }}>4 series × 8 reps</p>
        {/* Sets table */}
        <div className="space-y-0.5">
          <div className="flex text-[7px] px-1" style={{ color: colors.textMuted }}>
            <span className="w-6">SET</span>
            <span className="flex-1 text-center">KG</span>
            <span className="flex-1 text-center">REPS</span>
            <span className="w-6 text-center">RIR</span>
            <span className="w-5" />
          </div>
          {[
            { set: 1, kg: '80', reps: '8', rir: '2', done: true },
            { set: 2, kg: '80', reps: '8', rir: '1', done: true },
            { set: 3, kg: '82.5', reps: '7', rir: '0', done: true },
            { set: 4, kg: '82.5', reps: '', rir: '', done: false },
          ].map((row) => (
            <div
              key={row.set}
              className="flex items-center px-1 py-1 rounded text-[9px]"
              style={{
                backgroundColor: row.done ? 'rgba(63, 185, 80, 0.08)' : 'transparent',
                color: row.done ? colors.textPrimary : colors.textMuted,
              }}
            >
              <span className="w-6 font-medium" style={{ color: row.done ? colors.success : colors.textMuted }}>{row.set}</span>
              <span className="flex-1 text-center">{row.kg || '\u2014'}</span>
              <span className="flex-1 text-center">{row.reps || '\u2014'}</span>
              <span className="w-6 text-center">{row.rir || '\u2014'}</span>
              <span className="w-5 text-center">
                {row.done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Rest timer */}
      <div className="rounded-lg p-2.5 text-center" style={{ backgroundColor: 'rgba(88, 166, 255, 0.08)', border: '1px solid rgba(88, 166, 255, 0.2)' }}>
        <p className="text-[8px] mb-0.5" style={{ color: colors.accent }}>DESCANSO</p>
        <p className="text-xl font-mono font-bold" style={{ color: colors.accent }}>1:23</p>
      </div>
      {/* Next exercise preview */}
      <div className="mt-2.5 p-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: colors.bgSecondary }}>
        <div>
          <p className="text-[7px]" style={{ color: colors.textMuted }}>SIGUIENTE</p>
          <p className="text-[9px]" style={{ color: colors.textSecondary }}>Press Inclinado</p>
        </div>
        <ChevronRight size={12} style={{ color: colors.textMuted }} />
      </div>
      {/* Previous session comparison */}
      <div className="mt-2.5 p-2 rounded-lg" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
        <p className="text-[7px] mb-1.5" style={{ color: colors.textMuted }}>SESIÓN ANTERIOR</p>
        {[
          { set: 1, kg: '77.5', reps: '8' },
          { set: 2, kg: '77.5', reps: '8' },
          { set: 3, kg: '80', reps: '7' },
          { set: 4, kg: '80', reps: '6' },
        ].map((row) => (
          <div key={row.set} className="flex items-center text-[8px] py-0.5" style={{ color: colors.textMuted }}>
            <span className="w-6">S{row.set}</span>
            <span className="flex-1 text-center">{row.kg} kg</span>
            <span className="flex-1 text-center">{row.reps} reps</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockupProgressScreen() {
  return (
    <div className="px-2.5 pb-3" style={{ backgroundColor: colors.bgPrimary }}>
      <div className="pt-1 mb-2">
        <p className="text-[11px] font-bold" style={{ color: colors.textPrimary }}>Press Banca</p>
        <p className="text-[8px]" style={{ color: colors.textSecondary }}>Progreso últimos 3 meses</p>
      </div>
      {/* Fake chart */}
      <div className="rounded-lg p-2.5 mb-2.5" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}>
        <svg viewBox="0 0 240 100" className="w-full">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[20, 40, 60, 80].map((y) => (
            <line key={y} x1="0" y1={y} x2="240" y2={y} stroke={colors.bgTertiary} strokeWidth="0.5" />
          ))}
          {/* Area */}
          <path d="M0,85 L30,78 L60,72 L90,65 L120,58 L150,48 L180,42 L210,35 L240,25 L240,100 L0,100Z" fill="url(#chartGrad)" />
          {/* Line */}
          <path d="M0,85 L30,78 L60,72 L90,65 L120,58 L150,48 L180,42 L210,35 L240,25" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Dots */}
          {[
            [0, 85], [30, 78], [60, 72], [90, 65], [120, 58], [150, 48], [180, 42], [210, 35], [240, 25],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill={colors.bgPrimary} stroke={colors.accent} strokeWidth="1.5" />
          ))}
        </svg>
        <div className="flex justify-between mt-1.5 text-[7px]" style={{ color: colors.textMuted }}>
          <span>Dic</span><span>Ene</span><span>Feb</span><span>Mar</span>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        {[
          { label: '1RM Est.', value: '102.5kg', color: colors.accent },
          { label: 'Máx Peso', value: '90kg', color: colors.purple },
          { label: 'Volumen', value: '12,400', color: colors.success },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg p-1.5 text-center" style={{ backgroundColor: colors.bgSecondary }}>
            <p className="text-[7px]" style={{ color: colors.textMuted }}>{stat.label}</p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>
      {/* Recent sessions */}
      <p className="text-[8px] font-medium mb-1" style={{ color: colors.textSecondary }}>Últimas sesiones</p>
      {[
        { date: '8 Mar', weight: '87.5 kg', reps: '8 reps' },
        { date: '4 Mar', weight: '85 kg', reps: '8 reps' },
        { date: '28 Feb', weight: '85 kg', reps: '7 reps' },
        { date: '24 Feb', weight: '82.5 kg', reps: '8 reps' },
        { date: '20 Feb', weight: '82.5 kg', reps: '7 reps' },
      ].map((session) => (
        <div key={session.date} className="flex justify-between items-center py-1 text-[8px]" style={{ borderBottom: `1px solid ${colors.bgTertiary}` }}>
          <span style={{ color: colors.textSecondary }}>{session.date}</span>
          <div className="flex gap-2">
            <span style={{ color: colors.textPrimary }}>{session.weight}</span>
            <span style={{ color: colors.textSecondary }}>{session.reps}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PhoneMockup
export { MockupRoutineScreen, MockupWorkoutScreen, MockupProgressScreen }
