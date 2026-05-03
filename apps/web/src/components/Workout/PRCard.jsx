import { forwardRef } from 'react'
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
import { colors } from '../../lib/styles.js'

const C = colors
const TROPHY = '🏆'
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

function HeroDetail({ detail, label, previous, t }) {
  const value = formatPRDetailValue(detail)
  return (
    <div style={{
      backgroundColor: C.bgTertiary,
      borderRadius: 16,
      padding: '40px 24px',
      textAlign: 'center',
      border: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 16 }}>{TROPHY}</div>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: C.gold,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        marginBottom: 12,
        fontFamily: FONT,
      }}>
        {t('workout:summary.newRecord')}
      </div>
      <div style={{
        fontSize: 64,
        fontWeight: 800,
        color: C.gold,
        lineHeight: 1.05,
        fontFamily: FONT,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 14,
        color: C.textSecondary,
        marginTop: 12,
        fontFamily: FONT,
      }}>
        {label}
      </div>
      {previous && (
        <div style={{
          fontSize: 12,
          color: C.textMuted,
          marginTop: 16,
          fontFamily: FONT,
        }}>
          {previous}
        </div>
      )}
    </div>
  )
}

function ListRow({ detail, label, previous }) {
  const valueStr = formatPRDetailListValue(detail)
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '14px 16px',
      backgroundColor: C.goldBg,
      borderRadius: 10,
      borderLeft: `3px solid ${C.gold}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.gold,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          fontFamily: FONT,
        }}>
          {label}
        </div>
        {previous && (
          <div style={{
            fontSize: 11,
            color: C.textMuted,
            marginTop: 2,
            fontFamily: FONT,
          }}>
            {previous}
          </div>
        )}
      </div>
      <div style={{
        fontSize: 22,
        fontWeight: 800,
        color: C.gold,
        fontFamily: FONT,
        flexShrink: 0,
      }}>
        {valueStr}
      </div>
    </div>
  )
}

const PRCard = forwardRef(function PRCard({ pr, date }, ref) {
  const { t } = useTranslation()
  const data = preparePRCardData(pr)
  if (!data) return null

  const { exerciseName, details, mode } = data

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

      {/* Records section — anclada en el centro vertical */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {mode === 'hero' ? (
          <HeroDetail
            detail={details[0]}
            label={formatPRDetailLabel(details[0])}
            previous={formatPRDetailPrevious(details[0])}
            t={t}
          />
        ) : (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 18 }}>{TROPHY}</span>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: C.gold,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}>
                {t('workout:summary.newRecords')}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {details.map((d, i) => (
                <ListRow
                  key={`${d.type}-${d.repCount ?? i}`}
                  detail={d}
                  label={formatPRDetailLabel(d)}
                  previous={formatPRDetailPrevious(d)}
                />
              ))}
            </div>
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
