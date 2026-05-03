import { forwardRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  APP_NAME,
  APP_URL,
  preparePRCardData,
  formatPRDetailLabel,
  formatPRDetailValue,
  formatPRDetailPrevious,
  formatPRDetailListValue,
} from '@gym/shared'
import { colors } from '../../lib/styles'

const TROPHY = '🏆'

function HeroDetail({ detail, label, previous, t }) {
  const value = formatPRDetailValue(detail)
  return (
    <View style={s.heroBox}>
      <Text style={s.heroTrophy}>{TROPHY}</Text>
      <Text style={s.heroEyebrow}>{t('workout:summary.newRecord')}</Text>
      <Text style={s.heroValue}>{value}</Text>
      <Text style={s.heroSubtitle}>{label}</Text>
      {previous ? <Text style={s.heroPrevious}>{previous}</Text> : null}
    </View>
  )
}

function ListRow({ detail, label, previous }) {
  const valueStr = formatPRDetailListValue(detail)
  return (
    <View style={s.listRow}>
      <View style={s.listRowMain}>
        <Text style={s.listRowLabel}>{label}</Text>
        {previous ? <Text style={s.listRowPrevious}>{previous}</Text> : null}
      </View>
      <Text style={s.listRowValue}>{valueStr}</Text>
    </View>
  )
}

const PRCard = forwardRef(function PRCard({ pr, date }, ref) {
  const { t } = useTranslation()
  const data = preparePRCardData(pr)
  if (!data) return null

  const { exerciseName, details, mode } = data

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

      {/* Records section — anclada al centro vertical */}
      <View style={s.recordsSection}>
        {mode === 'hero' ? (
          <HeroDetail
            detail={details[0]}
            label={formatPRDetailLabel(details[0])}
            previous={formatPRDetailPrevious(details[0])}
            t={t}
          />
        ) : (
          <View>
            <View style={s.listHeader}>
              <Text style={s.listHeaderTrophy}>{TROPHY}</Text>
              <Text style={s.listHeaderText}>{t('workout:summary.newRecords')}</Text>
            </View>
            <View style={s.listGroup}>
              {details.map((d, i) => (
                <ListRow
                  key={`${d.type}-${d.repCount ?? i}`}
                  detail={d}
                  label={formatPRDetailLabel(d)}
                  previous={formatPRDetailPrevious(d)}
                />
              ))}
            </View>
          </View>
        )}
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
  recordsSection: {
    flex: 1,
    justifyContent: 'center',
  },
  heroBox: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTrophy: {
    fontSize: 56,
    lineHeight: 60,
    marginBottom: 16,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  heroValue: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.gold,
    lineHeight: 68,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  heroPrevious: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  listHeaderTrophy: {
    fontSize: 18,
  },
  listHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  listGroup: {
    gap: 10,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.goldBg,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  listRowMain: {
    flex: 1,
  },
  listRowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  listRowPrevious: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  listRowValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.gold,
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
