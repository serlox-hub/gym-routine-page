import { motion } from 'framer-motion'
import {
  Dumbbell,
  CalendarDays,
  TrendingUp,
  Sparkles,
  Timer,
  Activity,
} from 'lucide-react'
import { colors } from '../../lib/styles.js'
import AnimatedSection from './AnimatedSection'

const FEATURES = [
  {
    icon: Dumbbell,
    title: 'Rutinas personalizadas',
    description: 'Crea rutinas con días, bloques y ejercicios. Configura series, repeticiones, tempo y más.',
    color: colors.accent,
  },
  {
    icon: Timer,
    title: 'Seguimiento en vivo',
    description: 'Registra cada serie en tiempo real con temporizador de descanso y alertas de audio.',
    color: colors.success,
  },
  {
    icon: TrendingUp,
    title: 'Progreso visual',
    description: 'Gráficos de evolución por ejercicio, estimación de 1RM y volumen total de entrenamiento.',
    color: colors.purple,
  },
  {
    icon: Sparkles,
    title: 'Generación con IA',
    description: 'Genera rutinas completas con ChatGPT o Claude. Importa y exporta en JSON.',
    color: colors.warning,
  },
  {
    icon: CalendarDays,
    title: 'Historial completo',
    description: 'Calendario mensual con todas tus sesiones. Revisa cualquier entrenamiento pasado al detalle.',
    color: colors.pink,
  },
  {
    icon: Activity,
    title: 'Métricas corporales',
    description: 'Registra tu peso y medidas. Visualiza tendencias y evolución en el tiempo.',
    color: colors.teal,
  },
]

function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(63, 185, 80, 0.04) 0%, transparent 50%)' }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <AnimatedSection className="text-center mb-16">
          <span
            className="inline-block text-xs font-semibold tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ color: colors.success, backgroundColor: 'rgba(63, 185, 80, 0.1)', border: '1px solid rgba(63, 185, 80, 0.2)' }}
          >
            FUNCIONALIDADES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: colors.textPrimary }}>
            Todo lo que necesitas para entrenar
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
            Desde la planificación hasta el análisis, cada herramienta diseñada para ayudarte a progresar.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <AnimatedSection key={feature.title} delay={i * 0.1}>
              <motion.div
                className="group h-full rounded-xl p-6 transition-all duration-300 cursor-default"
                style={{
                  backgroundColor: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
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
                <h3 className="text-base font-bold mb-2" style={{ color: colors.textPrimary }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>{feature.description}</p>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
