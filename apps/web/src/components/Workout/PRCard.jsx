import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { APP_NAME, APP_URL, formatPRDetailValue, formatPRDetailPrevious } from '@gym/shared'
import { colors } from '../../lib/styles.js'

// Diseño base 540×500 (aspect ~1.08, casi cuadrado). Todas las medidas escalan con `width`.
const BASE_W = 540
const BASE_H = 500
export const PR_CARD_ASPECT = BASE_W / BASE_H

const C = colors
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

// SVG inline con los paths de Lucide Trophy. Stroke explícito (no currentColor)
// para que html2canvas lo capture correctamente.
function TrophySVG({ size, color, strokeWidth = 1.5 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

const PRCard = forwardRef(function PRCard({ exerciseName, date, record, width = BASE_W }, ref) {
  const { t } = useTranslation()
  if (!record) return null

  const k = width / BASE_W
  const height = BASE_H * k
  const value = formatPRDetailValue(record)
  const previous = formatPRDetailPrevious(record)

  return (
    <div
      ref={ref}
      style={{
        width,
        height,
        backgroundColor: C.bgPrimary,
        fontFamily: FONT,
        padding: 14 * k,
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        height: '100%',
        backgroundColor: C.bgSecondary,
        borderRadius: 24 * k,
        padding: `${18 * k}px ${20 * k}px`,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}>
        {/* Header / Branding */}
        <div style={{ textAlign: 'center', marginBottom: 10 * k }}>
          <div style={{
            fontSize: 12 * k,
            fontWeight: 700,
            color: C.success,
            letterSpacing: `${2.5 * k}px`,
            textTransform: 'uppercase',
          }}>{APP_NAME}</div>
          <div style={{
            width: 28 * k,
            height: 2 * k,
            backgroundColor: C.success,
            margin: `${6 * k}px auto 0`,
            borderRadius: 1 * k,
          }} />
        </div>

        {/* Exercise name + date */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 28 * k,
            fontWeight: 800,
            color: C.textPrimary,
            lineHeight: `${32 * k}px`,
            textTransform: 'uppercase',
          }}>{exerciseName}</div>
          {date && (
            <div style={{
              fontSize: 12 * k,
              color: C.textMuted,
              marginTop: 4 * k,
              textTransform: 'capitalize',
            }}>{date}</div>
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
          <div style={{ marginBottom: 6 * k, lineHeight: 0 }}>
            <TrophySVG size={48 * k} color={C.gold} />
          </div>
          <div style={{
            fontSize: 11 * k,
            fontWeight: 700,
            color: C.gold,
            letterSpacing: `${1.6 * k}px`,
            textTransform: 'uppercase',
            marginBottom: 6 * k,
          }}>{t('workout:summary.newRecord')}</div>
          <div style={{
            fontSize: 52 * k,
            fontWeight: 800,
            color: C.gold,
            lineHeight: `${68 * k}px`,
          }}>{value}</div>
          {previous && (
            <div style={{
              fontSize: 13 * k,
              color: C.textMuted,
              marginTop: 12 * k,
            }}>{previous}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: 10 * k,
          borderTop: `1px solid ${C.border}`,
        }}>
          <div style={{
            fontSize: 11 * k,
            color: C.textSecondary,
            letterSpacing: `${1 * k}px`,
          }}>{APP_URL}</div>
        </div>
      </div>
    </div>
  )
})

export default PRCard
