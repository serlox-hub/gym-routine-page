import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Target, Zap, BarChart3 } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import AnimatedSection from './AnimatedSection'

function StepsSection() {
  const { t } = useTranslation()

  const STEPS = [
    {
      number: '01',
      title: t('landing:steps.create.title'),
      description: t('landing:steps.create.description'),
      icon: Target,
    },
    {
      number: '02',
      title: t('landing:steps.train.title'),
      description: t('landing:steps.train.description'),
      icon: Zap,
    },
    {
      number: '03',
      title: t('landing:steps.analyze.title'),
      description: t('landing:steps.analyze.description'),
      icon: BarChart3,
    },
  ]

  return (
    <section className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <AnimatedSection className="text-center mb-16">
          <span
            className="inline-block text-xs font-semibold tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ color: colors.purple, backgroundColor: 'rgba(163, 113, 247, 0.1)', border: '1px solid rgba(163, 113, 247, 0.2)' }}
          >
            {t('landing:steps.tag')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: colors.textPrimary }}>
            {t('landing:steps.title')}
          </h2>
        </AnimatedSection>

        <div className="space-y-8">
          {STEPS.map((step, i) => (
            <AnimatedSection key={step.number} delay={i * 0.15}>
              <motion.div
                className="flex items-start gap-6 p-6 rounded-xl"
                style={{
                  backgroundColor: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                }}
                whileHover={{
                  borderColor: colors.purple + '40',
                  boxShadow: '0 8px 30px rgba(163, 113, 247, 0.08)',
                }}
              >
                <div className="flex-shrink-0">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${colors.accentBg}, ${colors.purpleBg})`,
                    }}
                  >
                    <span
                      className="text-xl font-extrabold"
                      style={{
                        background: `linear-gradient(135deg, ${colors.accent}, ${colors.purple})`,
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
                    <step.icon size={18} style={{ color: colors.purple }} />
                    <h3 className="text-lg font-bold" style={{ color: colors.textPrimary }}>{step.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>{step.description}</p>
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
