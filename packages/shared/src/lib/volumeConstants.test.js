import { describe, it, expect } from 'vitest'
import { getVolumeLandmarks, getVolumeZone, VOLUME_LANDMARKS } from './volumeConstants.js'

describe('getVolumeLandmarks', () => {
  it('devuelve rangos para grupo muscular existente', () => {
    const result = getVolumeLandmarks('Pecho')
    expect(result).toEqual({ mv: 4, mev: 6, mav: 16, mrv: 22 })
  })

  it('devuelve null para grupo muscular inexistente', () => {
    expect(getVolumeLandmarks('Inventado')).toBeNull()
  })

  it('tiene rangos para todos los grupos principales', () => {
    const groups = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiotibiales', 'Pantorrillas', 'Abdominales', 'Glúteos']
    for (const group of groups) {
      expect(getVolumeLandmarks(group)).not.toBeNull()
    }
  })
})

describe('getVolumeZone', () => {
  it('devuelve below_mv para series bajo el volumen de mantenimiento', () => {
    expect(getVolumeZone('Pecho', 3)).toBe('below_mv')
  })

  it('devuelve mv_mev entre mantenimiento y minimo efectivo', () => {
    expect(getVolumeZone('Pecho', 5)).toBe('mv_mev')
  })

  it('devuelve mev_mav en rango optimo', () => {
    expect(getVolumeZone('Pecho', 12)).toBe('mev_mav')
  })

  it('devuelve above_mav entre maximo adaptativo y maximo recuperable', () => {
    expect(getVolumeZone('Pecho', 20)).toBe('above_mav')
  })

  it('devuelve above_mrv por encima del maximo recuperable', () => {
    expect(getVolumeZone('Pecho', 25)).toBe('above_mrv')
  })

  it('devuelve null para grupo muscular inexistente', () => {
    expect(getVolumeZone('Inventado', 10)).toBeNull()
  })

  it('maneja grupos con MV y MEV en 0', () => {
    // Abdominales: mv=0, mev=0 → 0 series ya cae en mev_mav (no necesitan trabajo directo)
    expect(getVolumeZone('Abdominales', 0)).toBe('mev_mav')
    expect(getVolumeZone('Abdominales', 10)).toBe('mev_mav')
  })

  it('limites exactos se asignan correctamente', () => {
    // En el limite exacto de MEV -> pertenece a mev_mav
    expect(getVolumeZone('Pecho', 6)).toBe('mev_mav')
    // En el limite exacto de MAV -> pertenece a mev_mav
    expect(getVolumeZone('Pecho', 16)).toBe('mev_mav')
    // En el limite exacto de MRV -> pertenece a above_mav
    expect(getVolumeZone('Pecho', 22)).toBe('above_mav')
  })
})

describe('VOLUME_LANDMARKS', () => {
  it('todos los rangos son coherentes (mv <= mev <= mav <= mrv)', () => {
    for (const [name, l] of Object.entries(VOLUME_LANDMARKS)) {
      expect(l.mv, `${name}: mv <= mev`).toBeLessThanOrEqual(l.mev)
      expect(l.mev, `${name}: mev <= mav`).toBeLessThanOrEqual(l.mav)
      expect(l.mav, `${name}: mav <= mrv`).toBeLessThanOrEqual(l.mrv)
    }
  })
})
