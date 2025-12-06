/**
 * Utilidades para validación de formularios
 */

/**
 * Valida el formulario de registro
 * @param {{email: string, password: string, confirmPassword: string}} data - Datos del formulario
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateSignupForm({ email, password, confirmPassword }) {
  if (!email || !password || !confirmPassword) {
    return { valid: false, error: 'Por favor completa todos los campos' }
  }

  if (!isValidEmail(email)) {
    return { valid: false, error: 'El email no es válido' }
  }

  if (password.length < 6) {
    return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  if (password !== confirmPassword) {
    return { valid: false, error: 'Las contraseñas no coinciden' }
  }

  return { valid: true, error: null }
}

/**
 * Valida el formulario de login
 * @param {{email: string, password: string}} data - Datos del formulario
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateLoginForm({ email, password }) {
  if (!email || !password) {
    return { valid: false, error: 'Por favor completa todos los campos' }
  }

  return { valid: true, error: null }
}

/**
 * Valida el formulario de rutina
 * @param {{name: string, description?: string, goal?: string}} data - Datos del formulario
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateRoutineForm({ name }) {
  if (!name || !name.trim()) {
    return { valid: false, error: 'El nombre es obligatorio' }
  }

  return { valid: true, error: null }
}

/**
 * Prepara los datos de rutina para enviar (sanitiza)
 * @param {{name: string, description?: string, goal?: string}} form - Datos del formulario
 * @returns {{name: string, description: string|null, goal: string|null}}
 */
export function prepareRoutineData(form) {
  return {
    name: form.name.trim(),
    description: form.description?.trim() || null,
    goal: form.goal?.trim() || null,
  }
}

/**
 * Verifica si un email es válido
 * @param {string} email - Email a validar
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Verifica si un string no está vacío después de trim
 * @param {string} value - Valor a verificar
 * @returns {boolean}
 */
export function isNotEmpty(value) {
  return value && value.trim().length > 0
}

/**
 * Verifica longitud mínima
 * @param {string} value - Valor a verificar
 * @param {number} minLength - Longitud mínima
 * @returns {boolean}
 */
export function hasMinLength(value, minLength) {
  return value && value.length >= minLength
}
