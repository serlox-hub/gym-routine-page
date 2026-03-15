import { describe, it, expect } from 'vitest'
import {
  validateSignupForm,
  validateLoginForm,
  validateRoutineForm,
  prepareRoutineData,
  isValidEmail,
  isNotEmpty,
  hasMinLength,
} from './validation.js'

describe('validation', () => {
  describe('validateSignupForm', () => {
    const validData = {
      email: 'test@email.com',
      password: 'password123',
      confirmPassword: 'password123',
    }

    it('valida formulario correcto', () => {
      const result = validateSignupForm(validData)
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('rechaza si falta email', () => {
      const result = validateSignupForm({ ...validData, email: '' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Por favor completa todos los campos')
    })

    it('rechaza si falta password', () => {
      const result = validateSignupForm({ ...validData, password: '' })
      expect(result.valid).toBe(false)
    })

    it('rechaza si falta confirmPassword', () => {
      const result = validateSignupForm({ ...validData, confirmPassword: '' })
      expect(result.valid).toBe(false)
    })

    it('rechaza email inválido', () => {
      const result = validateSignupForm({ ...validData, email: 'invalid-email' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('El email no es válido')
    })

    it('rechaza password corta', () => {
      const result = validateSignupForm({
        ...validData,
        password: '12345',
        confirmPassword: '12345',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('La contraseña debe tener al menos 6 caracteres')
    })

    it('rechaza si passwords no coinciden', () => {
      const result = validateSignupForm({
        ...validData,
        confirmPassword: 'different',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Las contraseñas no coinciden')
    })
  })

  describe('validateLoginForm', () => {
    it('valida formulario correcto', () => {
      const result = validateLoginForm({ email: 'test@email.com', password: 'password' })
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('rechaza si falta email', () => {
      const result = validateLoginForm({ email: '', password: 'password' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Por favor completa todos los campos')
    })

    it('rechaza si falta password', () => {
      const result = validateLoginForm({ email: 'test@email.com', password: '' })
      expect(result.valid).toBe(false)
    })
  })

  describe('validateRoutineForm', () => {
    it('valida formulario con nombre', () => {
      const result = validateRoutineForm({ name: 'Mi rutina' })
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('rechaza si falta nombre', () => {
      const result = validateRoutineForm({ name: '' })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('El nombre es obligatorio')
    })

    it('rechaza nombre solo con espacios', () => {
      const result = validateRoutineForm({ name: '   ' })
      expect(result.valid).toBe(false)
    })
  })

  describe('prepareRoutineData', () => {
    it('prepara datos con trim', () => {
      const form = {
        name: '  Mi rutina  ',
        description: '  Descripción  ',
        goal: '  Hipertrofia  ',
      }
      const result = prepareRoutineData(form)
      expect(result).toEqual({
        name: 'Mi rutina',
        description: 'Descripción',
        goal: 'Hipertrofia',
      })
    })

    it('convierte campos vacíos a null', () => {
      const form = { name: 'Mi rutina', description: '', goal: '   ' }
      const result = prepareRoutineData(form)
      expect(result.description).toBeNull()
      expect(result.goal).toBeNull()
    })

    it('maneja campos undefined', () => {
      const form = { name: 'Mi rutina' }
      const result = prepareRoutineData(form)
      expect(result.description).toBeNull()
      expect(result.goal).toBeNull()
    })
  })

  describe('isValidEmail', () => {
    it('acepta email válido', () => {
      expect(isValidEmail('test@email.com')).toBe(true)
      expect(isValidEmail('user.name@domain.org')).toBe(true)
      expect(isValidEmail('user+tag@email.co.uk')).toBe(true)
    })

    it('rechaza email sin @', () => {
      expect(isValidEmail('testemail.com')).toBe(false)
    })

    it('rechaza email sin dominio', () => {
      expect(isValidEmail('test@')).toBe(false)
    })

    it('rechaza email sin usuario', () => {
      expect(isValidEmail('@email.com')).toBe(false)
    })

    it('rechaza email con espacios', () => {
      expect(isValidEmail('test @email.com')).toBe(false)
    })
  })

  describe('isNotEmpty', () => {
    it('retorna true para string con contenido', () => {
      expect(isNotEmpty('hello')).toBe(true)
      expect(isNotEmpty('  hello  ')).toBe(true)
    })

    it('retorna false para string vacío', () => {
      expect(isNotEmpty('')).toBeFalsy()
    })

    it('retorna false para solo espacios', () => {
      expect(isNotEmpty('   ')).toBeFalsy()
    })

    it('retorna false para null/undefined', () => {
      expect(isNotEmpty(null)).toBeFalsy()
      expect(isNotEmpty(undefined)).toBeFalsy()
    })
  })

  describe('hasMinLength', () => {
    it('retorna true si cumple longitud mínima', () => {
      expect(hasMinLength('hello', 5)).toBe(true)
      expect(hasMinLength('hello world', 5)).toBe(true)
    })

    it('retorna false si no cumple longitud mínima', () => {
      expect(hasMinLength('hi', 5)).toBe(false)
    })

    it('retorna false para null/undefined', () => {
      expect(hasMinLength(null, 1)).toBeFalsy()
      expect(hasMinLength(undefined, 1)).toBeFalsy()
    })

    it('longitud exacta es válida', () => {
      expect(hasMinLength('abc', 3)).toBe(true)
    })
  })
})
