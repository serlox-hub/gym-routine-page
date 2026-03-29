import { useTranslation } from 'react-i18next'
import { colors, RGB_ACCENT } from '../../lib/styles.js'
import AnimatedSection from './AnimatedSection'
import PhoneMockup, { MockupRoutineScreen, MockupWorkoutScreen, MockupProgressScreen } from './PhoneMockup'

function ShowcaseSection() {
  const { t } = useTranslation()
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 70% 30%, rgba(${RGB_ACCENT}, 0.06) 0%, transparent 50%)` }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <AnimatedSection className="text-center mb-16">
          <span
            className="inline-block text-xs font-semibold tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ color: colors.accent, backgroundColor: colors.accentBgSubtle, border: `1px solid rgba(${RGB_ACCENT}, 0.2)` }}
          >
            {t('landing:showcase.tag')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: colors.textPrimary }}>
            {t('landing:showcase.title')}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: colors.textSecondary }}>
            {t('landing:showcase.subtitle')}
          </p>
        </AnimatedSection>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
          <AnimatedSection delay={0}>
            <div className="text-center">
              <PhoneMockup>
                <MockupRoutineScreen />
              </PhoneMockup>
              <p className="mt-4 text-sm font-medium" style={{ color: colors.textSecondary }}>{t('landing:showcase.planRoutine')}</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="text-center lg:-mt-12">
              <PhoneMockup>
                <MockupWorkoutScreen />
              </PhoneMockup>
              <p className="mt-4 text-sm font-medium" style={{ color: colors.textPrimary }}>{t('landing:showcase.trackLive')}</p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.4}>
            <div className="text-center">
              <PhoneMockup>
                <MockupProgressScreen />
              </PhoneMockup>
              <p className="mt-4 text-sm font-medium" style={{ color: colors.textSecondary }}>{t('landing:showcase.analyzeProgress')}</p>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}

export default ShowcaseSection
