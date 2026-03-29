import { t, getCurrentLocale } from '../i18n/index.js'

function getDateLocale() {
  const lang = getCurrentLocale()
  return lang === 'en' ? 'en-US' : 'es-ES'
}

export function formatFullDate(dateStr, locale) {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale || getDateLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDate(dateStr, locale) {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale || getDateLocale(), {
    day: 'numeric',
    month: 'short',
  })
}

export function formatTime(dateStr, locale) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString(locale || getDateLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t('common:time.today')
  if (diffDays === 1) return t('common:time.yesterday')
  if (diffDays < 7) return t('common:time.daysAgo', { count: diffDays })
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return t('common:time.weeksAgo', { count: weeks })
  }
  const months = Math.floor(diffDays / 30)
  return t('common:time.monthsAgo', { count: months })
}

export function getDaysDifference(date1, date2 = new Date()) {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffMs = d2 - d1
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function getDateKey(dateStr) {
  return dateStr.split('T')[0]
}
