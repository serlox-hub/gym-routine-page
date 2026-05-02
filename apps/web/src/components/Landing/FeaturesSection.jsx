import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ClipboardList,
  CalendarDays,
  TrendingUp,
  Sparkles,
  Timer,
  Activity,
} from 'lucide-react'
import { colors, RGB_SUCCESS } from '../../lib/styles.js'
import AnimatedSection from './AnimatedSection'

function FeaturesSection() {
  const { t } = useTranslation()

  const FEATURES = [
    {
      icon: ClipboardList,
      title: t('landing:features.routines.title'),
      description: t('landing:features.routines.description'),
      color: colors.success,
    },
    {
      icon: Timer,
      title: t('landing:features.liveTracking.title'),
      description: t('landing:features.liveTracking.description'),
      color: colors.orange,
    },
    {
      icon: TrendingUp,
      title: t('landing:features.progress.title'),
      description: t('landing:features.progress.description'),
      color: colors.success,
    },
    {
      icon: Sparkles,
      title: t('landing:features.ai.title'),
      description: t('landing:features.ai.description'),
      color: colors.purple,
    },
    {
      icon: CalendarDays,
      title: t('landing:features.history.title'),
      description: t('landing:features.history.description'),
      color: colors.pink,
    },
    {
      icon: Activity,
      title: t('landing:features.bodyMetrics.title'),
      description: t('landing:features.bodyMetrics.description'),
      color: colors.teal,
    },
  ]

  return (
    <section className="py-24 relative">
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 20% 50%, rgba(${RGB_SUCCESS}, 0.04) 0%, transparent 50%)` }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <AnimatedSection className="text-center mb-16">
          <span
            className="inline-block text-xs font-semibold tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ color: colors.success, backgroundColor: colors.successBgSubtle, border: `1px solid rgba(${RGB_SUCCESS}, 0.2)` }}
          >
            {t('landing:features.tag')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: colors.textPrimary }}>
            {t('landing:features.title')}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
            {t('landing:features.subtitle')}
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
