import { motion } from 'framer-motion'
import { Target, Zap, BarChart3 } from 'lucide-react'
import AnimatedSection from './AnimatedSection'

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

export default StepsSection
