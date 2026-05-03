import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { APP_NAME, APP_URL, formatPRDetailValue, formatPRDetailPrevious } from '@gym/shared'
import { colors } from '../../lib/styles.js'

const C = colors
const TROPHY = '🏆'
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

const PRCard = forwardRef(function PRCard({ exerciseName, date, record }, ref) {
  const { t } = useTranslation()
  if (!record) return null

  const value = formatPRDetailValue(record)
  const previous = formatPRDetailPrevious(record)

  return (
    <div
      ref={ref}
      style={{
        width: 540,
        minHeight: 960,
        backgroundColor: C.bgPrimary,
        fontFamily: FONT,
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header / Branding */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: C.success,
          letterSpacing: '3px',
          textTransform: 'uppercase',
        }}>
          {APP_NAME}
        </div>
        <div style={{
          width: 40,
          height: 2,
          backgroundColor: C.success,
          margin: '12px auto 0',
          borderRadius: 1,
        }} />
      </div>

      {/* Exercise name + date */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          fontSize: 32,
          fontWeight: 800,
          color: C.textPrimary,
          lineHeight: 1.15,
          textTransform: 'uppercase',
        }}>
          {exerciseName}
        </div>
        {date && (
          <div style={{
            fontSize: 13,
            color: C.textMuted,
            marginTop: 6,
            textTransform: 'capitalize',
          }}>
            {date}
          </div>
        )}
      </div>

      {/* Hero PR — anclado al centro vertical */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 24 }}>{TROPHY}</div>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.gold,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          {t('workout:summary.newRecord')}
        </div>
        <div style={{
          fontSize: 64,
          fontWeight: 800,
          color: C.gold,
          lineHeight: 1.05,
        }}>
          {value}
        </div>
        {previous && (
          <div style={{
            fontSize: 14,
            color: C.textMuted,
            marginTop: 16,
          }}>
            {previous}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: 20,
        paddingTop: 16,
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontSize: 12,
          color: C.textMuted,
          letterSpacing: '1px',
        }}>
          {APP_URL}
        </div>
      </div>
    </div>
  )
})

export default PRCard
