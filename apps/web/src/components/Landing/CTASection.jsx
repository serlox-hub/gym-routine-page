import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { colors, RGB_SUCCESS } from '../../lib/styles.js'
import AnimatedSection from './AnimatedSection'

function CTASection() {
  const { t } = useTranslation()
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(${RGB_SUCCESS}, 0.1) 0%, transparent 60%)` }} />
      <AnimatedSection className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative">
        <motion.div
          className="rounded-2xl p-10 sm:p-14"
          style={{
            backgroundColor: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
            boxShadow: `0 0 60px rgba(${RGB_SUCCESS}, 0.08)`,
          }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: colors.textPrimary }}>
            {t('landing:cta.title')}
          </h2>
          <p className="text-lg mb-8 max-w-lg mx-auto" style={{ color: colors.textSecondary }}>
            {t('landing:cta.subtitle')}
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg"
            style={{
              backgroundColor: colors.success,
              color: colors.bgPrimary,
              boxShadow: `0 4px 25px rgba(${RGB_SUCCESS}, 0.35)`,
            }}
          >
            {t('landing:cta.button')}
            <ChevronRight size={20} />
          </Link>
        </motion.div>
      </AnimatedSection>
    </section>
  )
}

export default CTASection
