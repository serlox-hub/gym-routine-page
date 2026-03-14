import { motion } from 'framer-motion'
import {
  Dumbbell,
  CalendarDays,
  TrendingUp,
  Sparkles,
  Timer,
  Activity,
} from 'lucide-react'
import AnimatedSection from './AnimatedSection'

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

export default FeaturesSection
