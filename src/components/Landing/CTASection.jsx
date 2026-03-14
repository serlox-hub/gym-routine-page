import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import AnimatedSection from './AnimatedSection'

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

export default CTASection
