import i18n from 'i18next'

import esCommon from './locales/es/common.json'
import esAuth from './locales/es/auth.json'
import esRoutine from './locales/es/routine.json'
import esExercise from './locales/es/exercise.json'
import esWorkout from './locales/es/workout.json'
import esBody from './locales/es/body.json'
import esValidation from './locales/es/validation.json'
import esData from './locales/es/data.json'
import esAdmin from './locales/es/admin.json'
import esLanding from './locales/es/landing.json'

import enCommon from './locales/en/common.json'
import enAuth from './locales/en/auth.json'
import enRoutine from './locales/en/routine.json'
import enExercise from './locales/en/exercise.json'
import enWorkout from './locales/en/workout.json'
import enBody from './locales/en/body.json'
import enValidation from './locales/en/validation.json'
import enData from './locales/en/data.json'
import enAdmin from './locales/en/admin.json'
import enLanding from './locales/en/landing.json'

const resources = {
  es: {
    common: esCommon,
    auth: esAuth,
    routine: esRoutine,
    exercise: esExercise,
    workout: esWorkout,
    body: esBody,
    validation: esValidation,
    data: esData,
    admin: esAdmin,
    landing: esLanding,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    routine: enRoutine,
    exercise: enExercise,
    workout: enWorkout,
    body: enBody,
    validation: enValidation,
    data: enData,
    admin: enAdmin,
    landing: enLanding,
  },
}

const i18nConfig = {
  resources,
  lng: 'es',
  fallbackLng: 'es',
  defaultNS: 'common',
  ns: ['common', 'auth', 'routine', 'exercise', 'workout', 'body', 'validation', 'data', 'admin', 'landing'],
  interpolation: { escapeValue: false },
  initImmediate: false,
}

export function initI18n(options = {}) {
  if (i18n.isInitialized) {
    if (options.lng && options.lng !== i18n.language) {
      i18n.changeLanguage(options.lng)
    }
    return i18n
  }

  i18n.init({ ...i18nConfig, ...options })
  return i18n
}

// Fallback: resolve translation key directly from JSON resources.
// Handles interpolation for {{variable}} patterns.
function lookupFromResources(key, options) {
  const colonIdx = key.indexOf(':')
  const ns = colonIdx > -1 ? key.slice(0, colonIdx) : 'common'
  const path = colonIdx > -1 ? key.slice(colonIdx + 1) : key
  const lang = i18n.language || 'es'

  const nsData = resources[lang]?.[ns] || resources.es?.[ns]
  if (!nsData || !path) return key

  let value = path.split('.').reduce((obj, k) => obj?.[k], nsData)

  // Handle i18next pluralization (_one/_other)
  if (value === undefined && options?.count !== undefined) {
    const pluralSuffix = options.count === 1 ? '_one' : '_other'
    const parts = path.split('.')
    parts[parts.length - 1] = parts[parts.length - 1] + pluralSuffix
    value = parts.reduce((obj, k) => obj?.[k], nsData)
  }

  if (value === undefined) return options?.defaultValue ?? key

  if (typeof value !== 'string' || !options) return value

  // Simple interpolation: replace {{var}} with options[var]
  return value.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    return options[varName] !== undefined ? options[varName] : `{{${varName}}}`
  })
}

export function t(key, options) {
  if (i18n.isInitialized) {
    return i18n.t(key, options)
  }
  // Before init (during module evaluation), look up directly from resources
  return lookupFromResources(key, options)
}

export function getCurrentLocale() {
  return i18n.language || 'es'
}

export { i18n }
