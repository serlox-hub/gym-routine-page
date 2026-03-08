import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import {
  Dumbbell,
  CalendarDays,
  TrendingUp,
  Sparkles,
  Timer,
  BarChart3,
  ChevronRight,
  Activity,
  Target,
  Zap,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Dumbbell,
    title: 'Rutinas personalizadas',
    description: 'Crea rutinas con días, bloques y ejercicios. Configura series, repeticiones, tempo y más.',
    color: '#58a6ff',
  },
  {
    icon: Timer,
    title: 'Seguimiento en vivo',
    description: 'Registra cada serie en tiempo real con temporizador de descanso y alertas de audio.',
    color: '#3fb950',
  },
  {
    icon: TrendingUp,
    title: 'Progreso visual',
    description: 'Gráficos de evolución por ejercicio, estimación de 1RM y volumen total de entrenamiento.',
    color: '#a371f7',
  },
  {
    icon: Sparkles,
    title: 'Generación con IA',
    description: 'Genera rutinas completas con ChatGPT o Claude. Importa y exporta en JSON.',
    color: '#d29922',
  },
  {
    icon: CalendarDays,
    title: 'Historial completo',
    description: 'Calendario mensual con todas tus sesiones. Revisa cualquier entrenamiento pasado al detalle.',
    color: '#db61a2',
  },
  {
    icon: Activity,
    title: 'Métricas corporales',
    description: 'Registra tu peso y medidas. Visualiza tendencias y evolución en el tiempo.',
    color: '#88c6be',
  },
]

const STEPS = [
  {
    number: '01',
    title: 'Crea tu rutina',
    description: 'Diseña tu plan de entrenamiento o genera uno con IA. Elige entre plantillas populares como PPL, Upper/Lower o Full Body.',
    icon: Target,
  },
  {
    number: '02',
    title: 'Entrena y registra',
    description: 'Sigue tu rutina ejercicio por ejercicio. Registra peso, repeticiones y descansos en tiempo real.',
    icon: Zap,
  },
  {
    number: '03',
    title: 'Analiza tu progreso',
    description: 'Revisa gráficos de evolución, marcas personales y volumen de entrenamiento. Mejora sesión a sesión.',
    icon: BarChart3,
  },
]

function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function PhoneMockup({ children, className = '' }) {
  return (
    <div className={`relative mx-auto ${className}`} style={{ width: 230 }}>
      <div
        className="rounded-[2rem] p-[6px] shadow-2xl"
        style={{
          aspectRatio: '71.6 / 147.6',
          background: 'linear-gradient(145deg, #30363d, #21262d)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(88, 166, 255, 0.1)',
        }}
      >
        <div className="rounded-[1.6rem] overflow-hidden h-full flex flex-col" style={{ backgroundColor: '#0d1117' }}>
          {/* Dynamic Island */}
          <div className="flex-shrink-0 flex justify-center pt-2 pb-1" style={{ backgroundColor: '#0d1117' }}>
            <div className="rounded-full" style={{ width: 72, height: 18, backgroundColor: '#161b22' }} />
          </div>
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
          {/* Home indicator */}
          <div className="flex-shrink-0 flex justify-center pb-2 pt-1" style={{ backgroundColor: '#0d1117' }}>
            <div className="rounded-full" style={{ width: 80, height: 4, backgroundColor: '#30363d' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function MockupRoutineScreen() {
  return (
    <div className="px-2.5 pb-3" style={{ backgroundColor: '#0d1117' }}>
      <div className="flex items-center justify-between mb-2 pt-1">
        <p className="text-[11px] font-bold" style={{ color: '#e6edf3' }}>Push - Pull - Legs</p>
        <div className="w-5 h-5 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="2">
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
              backgroundColor: i === 0 ? 'rgba(88, 166, 255, 0.15)' : '#21262d',
              color: i === 0 ? '#58a6ff' : '#8b949e',
              border: i === 0 ? '1px solid rgba(88, 166, 255, 0.3)' : '1px solid transparent',
            }}
          >
            {day}
          </div>
        ))}
      </div>
      {/* Exercise cards */}
      {[
        { name: 'Press Banca', sets: '4×8', color: '#f85149', group: 'Pecho' },
        { name: 'Press Inclinado', sets: '3×10', color: '#f85149', group: 'Pecho' },
        { name: 'Aperturas Mancuerna', sets: '3×12', color: '#f85149', group: 'Pecho' },
        { name: 'Press Militar', sets: '4×8', color: '#a371f7', group: 'Hombros' },
        { name: 'Elevaciones Laterales', sets: '3×15', color: '#a371f7', group: 'Hombros' },
        { name: 'Fondos Paralelas', sets: '3×12', color: '#88c6be', group: 'Tríceps' },
        { name: 'Extensión Tríceps', sets: '3×12', color: '#88c6be', group: 'Tríceps' },
        { name: 'Press Francés', sets: '3×10', color: '#88c6be', group: 'Tríceps' },
      ].map((exercise) => (
        <div
          key={exercise.name}
          className="mb-1.5 rounded-lg relative overflow-hidden"
          style={{ backgroundColor: '#161b22' }}
        >
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{ width: 3, backgroundColor: exercise.color }}
          />
          <div className="pl-2.5 pr-2 py-1.5 text-left">
            <p className="text-[10px] font-medium leading-tight" style={{ color: '#e6edf3' }}>{exercise.name}</p>
            <p className="text-[8px] mt-0.5 leading-tight" style={{ color: '#8b949e' }}>
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
    <div className="px-2.5 pb-3" style={{ backgroundColor: '#0d1117' }}>
      {/* Header */}
      <div className="flex items-center justify-between pt-1 mb-2">
        <p className="text-[11px] font-bold" style={{ color: '#e6edf3' }}>Sesión activa</p>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#21262d', color: '#3fb950' }}>
          42:15
        </span>
      </div>
      {/* Current exercise */}
      <div className="mb-2.5 p-2 rounded-lg" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
        <p className="text-[10px] font-medium mb-0.5" style={{ color: '#e6edf3' }}>Press Banca</p>
        <p className="text-[8px] mb-2" style={{ color: '#8b949e' }}>4 series × 8 reps</p>
        {/* Sets table */}
        <div className="space-y-0.5">
          <div className="flex text-[7px] px-1" style={{ color: '#6e7681' }}>
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
                color: row.done ? '#e6edf3' : '#6e7681',
              }}
            >
              <span className="w-6 font-medium" style={{ color: row.done ? '#3fb950' : '#6e7681' }}>{row.set}</span>
              <span className="flex-1 text-center">{row.kg || '—'}</span>
              <span className="flex-1 text-center">{row.reps || '—'}</span>
              <span className="w-6 text-center">{row.rir || '—'}</span>
              <span className="w-5 text-center">
                {row.done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2.5">
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
        <p className="text-[8px] mb-0.5" style={{ color: '#58a6ff' }}>DESCANSO</p>
        <p className="text-xl font-mono font-bold" style={{ color: '#58a6ff' }}>1:23</p>
      </div>
      {/* Next exercise preview */}
      <div className="mt-2.5 p-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#161b22' }}>
        <div>
          <p className="text-[7px]" style={{ color: '#6e7681' }}>SIGUIENTE</p>
          <p className="text-[9px]" style={{ color: '#8b949e' }}>Press Inclinado</p>
        </div>
        <ChevronRight size={12} style={{ color: '#6e7681' }} />
      </div>
      {/* Previous session comparison */}
      <div className="mt-2.5 p-2 rounded-lg" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
        <p className="text-[7px] mb-1.5" style={{ color: '#6e7681' }}>SESIÓN ANTERIOR</p>
        {[
          { set: 1, kg: '77.5', reps: '8' },
          { set: 2, kg: '77.5', reps: '8' },
          { set: 3, kg: '80', reps: '7' },
          { set: 4, kg: '80', reps: '6' },
        ].map((row) => (
          <div key={row.set} className="flex items-center text-[8px] py-0.5" style={{ color: '#6e7681' }}>
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
    <div className="px-2.5 pb-3" style={{ backgroundColor: '#0d1117' }}>
      <div className="pt-1 mb-2">
        <p className="text-[11px] font-bold" style={{ color: '#e6edf3' }}>Press Banca</p>
        <p className="text-[8px]" style={{ color: '#8b949e' }}>Progreso últimos 3 meses</p>
      </div>
      {/* Fake chart */}
      <div className="rounded-lg p-2.5 mb-2.5" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
        <svg viewBox="0 0 240 100" className="w-full">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#58a6ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#58a6ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[20, 40, 60, 80].map((y) => (
            <line key={y} x1="0" y1={y} x2="240" y2={y} stroke="#21262d" strokeWidth="0.5" />
          ))}
          {/* Area */}
          <path d="M0,85 L30,78 L60,72 L90,65 L120,58 L150,48 L180,42 L210,35 L240,25 L240,100 L0,100Z" fill="url(#chartGrad)" />
          {/* Line */}
          <path d="M0,85 L30,78 L60,72 L90,65 L120,58 L150,48 L180,42 L210,35 L240,25" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Dots */}
          {[
            [0, 85], [30, 78], [60, 72], [90, 65], [120, 58], [150, 48], [180, 42], [210, 35], [240, 25],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="#0d1117" stroke="#58a6ff" strokeWidth="1.5" />
          ))}
        </svg>
        <div className="flex justify-between mt-1.5 text-[7px]" style={{ color: '#6e7681' }}>
          <span>Dic</span><span>Ene</span><span>Feb</span><span>Mar</span>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        {[
          { label: '1RM Est.', value: '102.5kg', color: '#58a6ff' },
          { label: 'Máx Peso', value: '90kg', color: '#a371f7' },
          { label: 'Volumen', value: '12,400', color: '#3fb950' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg p-1.5 text-center" style={{ backgroundColor: '#161b22' }}>
            <p className="text-[7px]" style={{ color: '#6e7681' }}>{stat.label}</p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>
      {/* Recent sessions */}
      <p className="text-[8px] font-medium mb-1" style={{ color: '#8b949e' }}>Últimas sesiones</p>
      {[
        { date: '8 Mar', weight: '87.5 kg', reps: '8 reps' },
        { date: '4 Mar', weight: '85 kg', reps: '8 reps' },
        { date: '28 Feb', weight: '85 kg', reps: '7 reps' },
        { date: '24 Feb', weight: '82.5 kg', reps: '8 reps' },
        { date: '20 Feb', weight: '82.5 kg', reps: '7 reps' },
      ].map((session) => (
        <div key={session.date} className="flex justify-between items-center py-1 text-[8px]" style={{ borderBottom: '1px solid #21262d' }}>
          <span style={{ color: '#8b949e' }}>{session.date}</span>
          <div className="flex gap-2">
            <span style={{ color: '#e6edf3' }}>{session.weight}</span>
            <span style={{ color: '#8b949e' }}>{session.reps}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function HeroSection() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [0, 150])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(88, 166, 255, 0.08) 0%, transparent 60%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(163, 113, 247, 0.05) 0%, transparent 50%)' }} />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 4 + i * 2,
            height: 4 + i * 2,
            backgroundColor: i % 2 === 0 ? 'rgba(88, 166, 255, 0.2)' : 'rgba(163, 113, 247, 0.2)',
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}

      <motion.div style={{ y, opacity }} className="w-full relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(88, 166, 255, 0.15)' }}>
                    <Dumbbell size={18} style={{ color: '#58a6ff' }} />
                  </div>
                  <span className="text-sm font-semibold tracking-wide" style={{ color: '#58a6ff' }}>
                    DIARIO GYM
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                  <span style={{ color: '#e6edf3' }}>Tu entrenamiento,</span>
                  <br />
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #58a6ff 0%, #a371f7 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    bajo control total.
                  </span>
                </h1>
              </motion.div>

              <motion.p
                className="text-lg sm:text-xl mb-8 leading-relaxed max-w-lg"
                style={{ color: '#8b949e' }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                Planifica rutinas, registra cada serie en tiempo real y visualiza tu progreso con gráficos detallados. Todo en un solo lugar.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #58a6ff 0%, #a371f7 100%)',
                    color: '#ffffff',
                    boxShadow: '0 4px 20px rgba(88, 166, 255, 0.3)',
                  }}
                >
                  Empezar ahora
                  <ChevronRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold transition-all duration-300 hover:bg-opacity-80"
                  style={{
                    backgroundColor: '#21262d',
                    color: '#e6edf3',
                    border: '1px solid #30363d',
                  }}
                >
                  Ya tengo cuenta
                </Link>
              </motion.div>
            </div>

            {/* Right: Phone mockup */}
            <motion.div
              initial={{ opacity: 0, y: 50, rotate: 3 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block"
            >
              <PhoneMockup>
                <MockupRoutineScreen />
              </PhoneMockup>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full flex items-start justify-center p-1.5" style={{ border: '2px solid #30363d' }}>
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: '#58a6ff' }}
            animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(63, 185, 80, 0.04) 0%, transparent 50%)' }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <AnimatedSection className="text-center mb-16">
          <span
            className="inline-block text-xs font-semibold tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ color: '#3fb950', backgroundColor: 'rgba(63, 185, 80, 0.1)', border: '1px solid rgba(63, 185, 80, 0.2)' }}
          >
            FUNCIONALIDADES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: '#e6edf3' }}>
            Todo lo que necesitas para entrenar
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#8b949e' }}>
            Desde la planificación hasta el análisis, cada herramienta diseñada para ayudarte a progresar.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <AnimatedSection key={feature.title} delay={i * 0.1}>
              <motion.div
                className="group h-full rounded-xl p-6 transition-all duration-300 cursor-default"
                style={{
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                }}
                whileHover={{
                  y: -4,
                  borderColor: feature.color + '40',
                  boxShadow: `0 8px 30px ${feature.color}15`,
                }}
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: feature.color + '15' }}
                >
                  <feature.icon size={22} style={{ color: feature.color }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#e6edf3' }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8b949e' }}>{feature.description}</p>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}

function ShowcaseSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 30%, rgba(88, 166, 255, 0.06) 0%, transparent 50%)' }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <AnimatedSection className="text-center mb-16">
          <span
            className="inline-block text-xs font-semibold tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ color: '#58a6ff', backgroundColor: 'rgba(88, 166, 255, 0.1)', border: '1px solid rgba(88, 166, 255, 0.2)' }}
          >
            LA APP EN ACCIÓN
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: '#e6edf3' }}>
            Diseñada para el gimnasio
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#8b949e' }}>
            Interfaz oscura, rápida y optimizada para usar entre series.
          </p>
        </AnimatedSection>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
          <AnimatedSection delay={0}>
            <div className="text-center">
              <PhoneMockup>
                <MockupRoutineScreen />
              </PhoneMockup>
              <p className="mt-4 text-sm font-medium" style={{ color: '#8b949e' }}>Planifica tu rutina</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="text-center lg:-mt-12">
              <PhoneMockup>
                <MockupWorkoutScreen />
              </PhoneMockup>
              <p className="mt-4 text-sm font-medium" style={{ color: '#e6edf3' }}>Registra en tiempo real</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.4}>
            <div className="text-center">
              <PhoneMockup>
                <MockupProgressScreen />
              </PhoneMockup>
              <p className="mt-4 text-sm font-medium" style={{ color: '#8b949e' }}>Analiza tu progreso</p>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}

function StepsSection() {
  return (
    <section className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <AnimatedSection className="text-center mb-16">
          <span
            className="inline-block text-xs font-semibold tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ color: '#a371f7', backgroundColor: 'rgba(163, 113, 247, 0.1)', border: '1px solid rgba(163, 113, 247, 0.2)' }}
          >
            CÓMO FUNCIONA
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: '#e6edf3' }}>
            En 3 simples pasos
          </h2>
        </AnimatedSection>

        <div className="space-y-8">
          {STEPS.map((step, i) => (
            <AnimatedSection key={step.number} delay={i * 0.15}>
              <motion.div
                className="flex items-start gap-6 p-6 rounded-xl"
                style={{
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                }}
                whileHover={{
                  borderColor: '#a371f740',
                  boxShadow: '0 8px 30px rgba(163, 113, 247, 0.08)',
                }}
              >
                <div className="flex-shrink-0">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.15), rgba(163, 113, 247, 0.15))',
                    }}
                  >
                    <span
                      className="text-xl font-extrabold"
                      style={{
                        background: 'linear-gradient(135deg, #58a6ff, #a371f7)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {step.number}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <step.icon size={18} style={{ color: '#a371f7' }} />
                    <h3 className="text-lg font-bold" style={{ color: '#e6edf3' }}>{step.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#8b949e' }}>{step.description}</p>
                </div>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(88, 166, 255, 0.08) 0%, transparent 60%)' }} />
      <AnimatedSection className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative">
        <motion.div
          className="rounded-2xl p-10 sm:p-14"
          style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            boxShadow: '0 0 60px rgba(88, 166, 255, 0.06)',
          }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: '#e6edf3' }}>
            Empieza a entrenar mejor hoy
          </h2>
          <p className="text-lg mb-8 max-w-lg mx-auto" style={{ color: '#8b949e' }}>
            Únete y lleva tu entrenamiento al siguiente nivel. Gratis, sin compromisos.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #58a6ff 0%, #a371f7 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 25px rgba(88, 166, 255, 0.35)',
            }}
          >
            Crear cuenta gratis
            <ChevronRight size={20} />
          </Link>
        </motion.div>
      </AnimatedSection>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-8" style={{ borderTop: '1px solid #21262d' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Dumbbell size={16} style={{ color: '#58a6ff' }} />
          <span className="text-sm font-semibold" style={{ color: '#8b949e' }}>Diario Gym</span>
        </div>
        <p className="text-xs" style={{ color: '#6e7681' }}>
          © {new Date().getFullYear()} Diario Gym. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0d1117' }}>
      <HeroSection />
      <FeaturesSection />
      <ShowcaseSection />
      <StepsSection />
      <CTASection />
      <Footer />
    </div>
  )
}
