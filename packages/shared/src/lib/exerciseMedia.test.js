import { describe, it, expect } from 'vitest'
import { getExerciseGifPath, GIF_SIZES, GIF_BUCKET } from './exerciseMedia.js'

describe('getExerciseGifPath', () => {
  it('construye la ruta con el tamaño por defecto (sm = 360)', () => {
    expect(getExerciseGifPath('1519')).toBe('gif/1519_360.gif')
  })

  it('respeta cada tamaño disponible', () => {
    expect(getExerciseGifPath('1519', 'xs')).toBe('gif/1519_180.gif')
    expect(getExerciseGifPath('1519', 'sm')).toBe('gif/1519_360.gif')
    expect(getExerciseGifPath('1519', 'lg')).toBe('gif/1519_720.gif')
  })

  it('acepta gif_key numérico', () => {
    expect(getExerciseGifPath(1519, 'xs')).toBe('gif/1519_180.gif')
  })

  it('cae a sm (360) ante un tamaño desconocido', () => {
    expect(getExerciseGifPath('1519', 'xl')).toBe('gif/1519_360.gif')
  })

  it('devuelve null cuando no hay gif_key', () => {
    expect(getExerciseGifPath(null)).toBeNull()
    expect(getExerciseGifPath(undefined)).toBeNull()
    expect(getExerciseGifPath('')).toBeNull()
    expect(getExerciseGifPath(0)).toBeNull()
  })

  it('expone los tamaños y el nombre del bucket esperados', () => {
    expect(GIF_SIZES).toEqual({ xs: 180, sm: 360, lg: 720 })
    expect(GIF_BUCKET).toBe('exercise-gifs')
  })
})
