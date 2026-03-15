import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Dumbbell, ChevronRight } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import PhoneMockup, { MockupRoutineScreen } from './PhoneMockup'

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
                    <Dumbbell size={18} style={{ color: colors.accent }} />
                  </div>
                  <span className="text-sm font-semibold tracking-wide" style={{ color: colors.accent }}>
                    DIARIO GYM
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                  <span style={{ color: colors.textPrimary }}>Tu entrenamiento,</span>
                  <br />
                  <span
                    style={{
                      background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.purple} 100%)`,
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
                style={{ color: colors.textSecondary }}
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
                    background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.purple} 100%)`,
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
                    backgroundColor: colors.bgTertiary,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
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
        <div className="w-6 h-10 rounded-full flex items-start justify-center p-1.5" style={{ border: `2px solid ${colors.border}` }}>
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: colors.accent }}
            animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  )
}

export default HeroSection
