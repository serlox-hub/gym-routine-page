import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { House, TimerReset, ClipboardList, Activity } from 'lucide-react'
import { colors, design } from '../../lib/styles.js'

const TABS = [
  { key: 'home', path: '/', icon: House, labelKey: 'common:nav.home' },
  { key: 'history', path: '/history', icon: TimerReset, labelKey: 'common:nav.history' },
  { key: 'routines', path: '/routines', icon: ClipboardList, labelKey: 'common:nav.routines' },
  { key: 'body', path: '/body-metrics', icon: Activity, labelKey: 'common:nav.body' },
]

function getActiveIndex(pathname) {
  if (pathname === '/') return 0
  for (let i = 1; i < TABS.length; i++) {
    if (pathname.startsWith(TABS[i].path)) return i
  }
  return 0
}

function BottomTabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const activeIndex = getActiveIndex(location.pathname)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      style={{ padding: '16px 21px 21px', paddingBottom: 'max(21px, env(safe-area-inset-bottom))' }}
    >
      <div
        className="flex items-center w-full max-w-2xl relative"
        style={{
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
          borderRadius: design.tabBarRadius,
          height: design.tabBarHeight,
          padding: design.tabBarPadding,
        }}
      >
        {/* Sliding pill */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: 4,
            width: 'calc(25% - 2px)',
            borderRadius: design.tabPillRadius,
            backgroundColor: colors.success,
            boxShadow: `0 2px 16px ${colors.success}40`,
            transform: `translateX(${activeIndex * 100}%)`,
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 0,
          }}
        />

        {TABS.map((tab, index) => {
          const active = activeIndex === index
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
              style={{
                borderRadius: design.tabPillRadius,
                color: active ? colors.bgPrimary : colors.textSecondary,
                zIndex: 1,
                transition: 'color 200ms ease',
              }}
            >
              <Icon size={18} />
              <span style={{
                fontSize: design.tabFontSize,
                fontWeight: active ? 600 : 500,
                letterSpacing: design.tabLetterSpacing,
                textTransform: 'uppercase',
              }}>
                {t(tab.labelKey)}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomTabBar
