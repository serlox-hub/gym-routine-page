import { t } from '../i18n/index.js'

export function validateSignupForm({ email, password, confirmPassword }) {
  if (!email || !password || !confirmPassword) {
    return { valid: false, error: t('validation:allFieldsRequired') }
  }

  if (!isValidEmail(email)) {
    return { valid: false, error: t('validation:invalidEmail') }
  }

  if (password.length < 6) {
    return { valid: false, error: t('validation:passwordMinLength') }
  }

  if (password !== confirmPassword) {
    return { valid: false, error: t('validation:passwordsDontMatch') }
  }

  return { valid: true, error: null }
}

export function validateLoginForm({ email, password }) {
  if (!email || !password) {
    return { valid: false, error: t('validation:allFieldsRequired') }
  }

  return { valid: true, error: null }
}

export function validateRoutineForm({ name }) {
  if (!name || !name.trim()) {
    return { valid: false, error: t('validation:nameRequired') }
  }

  return { valid: true, error: null }
}

export function prepareRoutineData(form) {
  return {
    name: form.name.trim(),
    description: form.description?.trim() || null,
    goal: form.goal?.trim() || null,
  }
}

export function validateResetPasswordForm({ password, confirmPassword }) {
  if (!password) {
    return { valid: false, error: t('validation:enterPassword') }
  }

  if (password.length < 6) {
    return { valid: false, error: t('validation:passwordMinLength') }
  }

  if (password !== confirmPassword) {
    return { valid: false, error: t('validation:passwordsDontMatch') }
  }

  return { valid: true, error: null }
}

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isNotEmpty(value) {
  return value && value.trim().length > 0
}

export function hasMinLength(value, minLength) {
  return value && value.length >= minLength
}
