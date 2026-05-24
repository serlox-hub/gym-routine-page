import { forwardRef } from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react-native'
import { APP_NAME, APP_URL, formatPRDetailValue, formatPRDetailPrevious } from '@gym/shared'
import { colors } from '../../lib/styles'

// Diseño base 540×500 (aspect ~1.08, casi cuadrado). Todas las medidas escalan con `width`.
const BASE_W = 540
const BASE_H = 500
export const PR_CARD_ASPECT = BASE_W / BASE_H

const PRCard = forwardRef(function PRCard({ exerciseName, date, record, width = BASE_W }, ref) {
  const { t } = useTranslation()
  if (!record) return null

  const k = width / BASE_W
  const height = BASE_H * k
  const value = formatPRDetailValue(record)
  const previous = formatPRDetailPrevious(record)

  return (
    <View
      ref={ref}
      style={{
        width,
        height,
        backgroundColor: colors.bgPrimary,
        padding: 14 * k,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgSecondary,
          borderRadius: 24 * k,
          paddingVertical: 18 * k,
          paddingHorizontal: 20 * k,
        }}
      >
        {/* Header / Branding */}
        <View style={{ alignItems: 'center', marginBottom: 10 * k }}>
          <Text style={{
            fontSize: 12 * k,
            fontWeight: '700',
            color: colors.success,
            letterSpacing: 2.5 * k,
            textTransform: 'uppercase',
          }}>{APP_NAME}</Text>
          <View style={{
            width: 28 * k,
            height: 2 * k,
            backgroundColor: colors.success,
            marginTop: 6 * k,
            borderRadius: 1 * k,
          }} />
        </View>

        {/* Exercise name + date */}
        <View style={{ alignItems: 'center' }}>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 28 * k,
              fontWeight: '800',
              color: colors.textPrimary,
              textTransform: 'uppercase',
              textAlign: 'center',
              lineHeight: 32 * k,
            }}
          >
            {exerciseName}
          </Text>
          {date ? (
            <Text style={{
              fontSize: 12 * k,
              color: colors.textMuted,
              marginTop: 4 * k,
              textTransform: 'capitalize',
            }}>{date}</Text>
          ) : null}
        </View>

        {/* Hero PR — anclado al centro vertical */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ marginBottom: 6 * k }}>
            <Trophy size={48 * k} color={colors.gold} strokeWidth={1.5} />
          </View>
          <Text style={{
            fontSize: 11 * k,
            fontWeight: '700',
            color: colors.gold,
            letterSpacing: 1.6 * k,
            textTransform: 'uppercase',
            marginBottom: 6 * k,
          }}>{t('workout:summary.newRecord')}</Text>
          <Text style={{
            fontSize: 52 * k,
            fontWeight: '800',
            color: colors.gold,
            lineHeight: 68 * k,
            textAlign: 'center',
          }}>{value}</Text>
          {previous ? (
            <Text style={{
              fontSize: 13 * k,
              color: colors.textMuted,
              marginTop: 12 * k,
              textAlign: 'center',
            }}>{previous}</Text>
          ) : null}
        </View>

        {/* Footer */}
        <View style={{
          alignItems: 'center',
          paddingTop: 10 * k,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
          <Text style={{
            fontSize: 11 * k,
            color: colors.textSecondary,
            letterSpacing: 1 * k,
          }}>{APP_URL}</Text>
        </View>
      </View>
    </View>
  )
})

export default PRCard
