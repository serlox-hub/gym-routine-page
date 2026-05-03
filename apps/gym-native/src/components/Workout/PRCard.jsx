import { forwardRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { APP_NAME, APP_URL, formatPRDetailValue, formatPRDetailPrevious } from '@gym/shared'
import { colors } from '../../lib/styles'

const TROPHY = '🏆'

const PRCard = forwardRef(function PRCard({ exerciseName, date, record }, ref) {
  const { t } = useTranslation()
  if (!record) return null

  const value = formatPRDetailValue(record)
  const previous = formatPRDetailPrevious(record)

  return (
    <View ref={ref} style={s.card}>
      {/* Header / Branding */}
      <View style={s.header}>
        <Text style={s.brandName}>{APP_NAME}</Text>
        <View style={s.brandLine} />
      </View>

      {/* Exercise name + date */}
      <View style={s.titleSection}>
        <Text style={s.exerciseName} numberOfLines={2}>{exerciseName}</Text>
        {date ? <Text style={s.date}>{date}</Text> : null}
      </View>

      {/* Hero PR — anclado al centro vertical */}
      <View style={s.hero}>
        <Text style={s.heroTrophy}>{TROPHY}</Text>
        <Text style={s.heroEyebrow}>{t('workout:summary.newRecord')}</Text>
        <Text style={s.heroValue}>{value}</Text>
        {previous ? <Text style={s.heroPrevious}>{previous}</Text> : null}
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.footerText}>{APP_URL}</Text>
      </View>
    </View>
  )
})

const s = StyleSheet.create({
  card: {
    width: 540,
    minHeight: 960,
    backgroundColor: colors.bgPrimary,
    padding: 40,
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  brandLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.success,
    marginTop: 12,
    borderRadius: 1,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  exerciseName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  date: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    textTransform: 'capitalize',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTrophy: {
    fontSize: 64,
    lineHeight: 70,
    marginBottom: 24,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  heroValue: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.gold,
    lineHeight: 70,
    textAlign: 'center',
  },
  heroPrevious: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
})

export default PRCard
