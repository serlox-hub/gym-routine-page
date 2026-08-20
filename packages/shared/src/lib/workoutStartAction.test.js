import { describe, it, expect } from 'vitest'
import { getFreeWorkoutAction, getRoutineDayAction, isSessionAlreadyInProgressError, SESSION_ALREADY_IN_PROGRESS, WORKOUT_START_ACTION } from './workoutStartAction.js'

describe('getFreeWorkoutAction', () => {
  it('arranca una sesión nueva cuando no hay ninguna en marcha', () => {
    expect(getFreeWorkoutAction({ hasActiveSession: false, routineDayId: null }))
      .toBe(WORKOUT_START_ACTION.START)
  })

  it('ignora la pulsación mientras el arranque está en vuelo', () => {
    expect(getFreeWorkoutAction({ hasActiveSession: false, routineDayId: null, isStarting: true }))
      .toBe(WORKOUT_START_ACTION.BUSY)
  })

  it('vuelve a la sesión libre activa', () => {
    expect(getFreeWorkoutAction({ hasActiveSession: true, routineDayId: null }))
      .toBe(WORKOUT_START_ACTION.RESUME)
  })

  it('bloquea si la sesión activa es de una rutina', () => {
    expect(getFreeWorkoutAction({ hasActiveSession: true, routineDayId: 7 }))
      .toBe(WORKOUT_START_ACTION.BLOCKED)
  })

  it('trata el routineDayId como id, no como booleano (el 0 es un id válido)', () => {
    expect(getFreeWorkoutAction({ hasActiveSession: true, routineDayId: 0 }))
      .toBe(WORKOUT_START_ACTION.BLOCKED)
  })

  it('acepta routineDayId string (params de ruta en web)', () => {
    expect(getFreeWorkoutAction({ hasActiveSession: true, routineDayId: '7' }))
      .toBe(WORKOUT_START_ACTION.BLOCKED)
  })

  it('undefined en routineDayId cuenta como sesión libre', () => {
    expect(getFreeWorkoutAction({ hasActiveSession: true, routineDayId: undefined }))
      .toBe(WORKOUT_START_ACTION.RESUME)
  })

  it('sin argumentos arranca (estado inicial del store)', () => {
    expect(getFreeWorkoutAction()).toBe(WORKOUT_START_ACTION.START)
  })

  it('la sesión en marcha manda sobre isStarting', () => {
    expect(getFreeWorkoutAction({ hasActiveSession: true, routineDayId: 3, isStarting: true }))
      .toBe(WORKOUT_START_ACTION.BLOCKED)
  })

  // issue #30: "no hay sesión" y "todavía no lo sé" no pueden dar lo mismo
  it('no deja arrancar mientras no se sepa si hay sesión activa', () => {
    expect(getFreeWorkoutAction({ hasActiveSession: false, routineDayId: null, hasSynced: false }))
      .toBe(WORKOUT_START_ACTION.BUSY)
  })

  it('sin sincronizar pero con sesión local conocida, no espera: eso ya es información', () => {
    expect(getFreeWorkoutAction({ hasActiveSession: true, routineDayId: null, hasSynced: false }))
      .toBe(WORKOUT_START_ACTION.RESUME)
    expect(getFreeWorkoutAction({ hasActiveSession: true, routineDayId: 4, hasSynced: false }))
      .toBe(WORKOUT_START_ACTION.BLOCKED)
  })

  it('hasSynced por defecto es true (no rompe a los llamadores que no lo pasan)', () => {
    expect(getFreeWorkoutAction({ hasActiveSession: false, routineDayId: null }))
      .toBe(WORKOUT_START_ACTION.START)
  })
})

describe('getRoutineDayAction', () => {
  it('arranca cuando no hay ninguna sesión en marcha', () => {
    expect(getRoutineDayAction({ hasActiveSession: false, activeRoutineDayId: null, dayId: 5 }))
      .toBe(WORKOUT_START_ACTION.START)
  })

  it('reanuda si la sesión activa es de ESTE día', () => {
    expect(getRoutineDayAction({ hasActiveSession: true, activeRoutineDayId: 5, dayId: 5 }))
      .toBe(WORKOUT_START_ACTION.RESUME)
  })

  it('compara ids sin importar el tipo (web los recibe string, native number)', () => {
    expect(getRoutineDayAction({ hasActiveSession: true, activeRoutineDayId: '5', dayId: 5 }))
      .toBe(WORKOUT_START_ACTION.RESUME)
    expect(getRoutineDayAction({ hasActiveSession: true, activeRoutineDayId: 5, dayId: '5' }))
      .toBe(WORKOUT_START_ACTION.RESUME)
  })

  it('bloquea si la sesión activa es de OTRO día', () => {
    expect(getRoutineDayAction({ hasActiveSession: true, activeRoutineDayId: 9, dayId: 5 }))
      .toBe(WORKOUT_START_ACTION.BLOCKED)
  })

  it('bloquea si la sesión activa es libre (sin día)', () => {
    expect(getRoutineDayAction({ hasActiveSession: true, activeRoutineDayId: null, dayId: 5 }))
      .toBe(WORKOUT_START_ACTION.BLOCKED)
  })

  // Precedencia INVERSA a la del botón de libre: este botón necesita los bloques
  // cargados, así que BUSY gana incluso sobre reanudar.
  it('BUSY manda mientras cargan los bloques, incluso sobre reanudar', () => {
    expect(getRoutineDayAction({ hasActiveSession: true, activeRoutineDayId: 5, dayId: 5, isLoading: true }))
      .toBe(WORKOUT_START_ACTION.BUSY)
  })

  it('BUSY manda con el arranque en vuelo, incluso sobre bloqueado', () => {
    expect(getRoutineDayAction({ hasActiveSession: true, activeRoutineDayId: 9, dayId: 5, isStarting: true }))
      .toBe(WORKOUT_START_ACTION.BUSY)
  })

  it('el día 0 es un id válido, no un ausente', () => {
    expect(getRoutineDayAction({ hasActiveSession: true, activeRoutineDayId: 0, dayId: 0 }))
      .toBe(WORKOUT_START_ACTION.RESUME)
    expect(getRoutineDayAction({ hasActiveSession: true, activeRoutineDayId: 0, dayId: 1 }))
      .toBe(WORKOUT_START_ACTION.BLOCKED)
  })

  // issue #30
  it('no deja arrancar mientras no se sepa si hay sesión activa', () => {
    expect(getRoutineDayAction({ hasActiveSession: false, activeRoutineDayId: null, dayId: 5, hasSynced: false }))
      .toBe(WORKOUT_START_ACTION.BUSY)
  })

  it('sin sincronizar pero con sesión local conocida, decide con ella', () => {
    expect(getRoutineDayAction({ hasActiveSession: true, activeRoutineDayId: 5, dayId: 5, hasSynced: false }))
      .toBe(WORKOUT_START_ACTION.RESUME)
    expect(getRoutineDayAction({ hasActiveSession: true, activeRoutineDayId: 9, dayId: 5, hasSynced: false }))
      .toBe(WORKOUT_START_ACTION.BLOCKED)
  })

  it('hasSynced por defecto es true', () => {
    expect(getRoutineDayAction({ hasActiveSession: false, activeRoutineDayId: null, dayId: 5 }))
      .toBe(WORKOUT_START_ACTION.START)
  })
})

describe('isSessionAlreadyInProgressError', () => {
  it('reconoce el token que levanta el RPC', () => {
    expect(isSessionAlreadyInProgressError({ message: SESSION_ALREADY_IN_PROGRESS, code: 'P0001' })).toBe(true)
  })

  it('lo reconoce aunque venga envuelto en más texto', () => {
    expect(isSessionAlreadyInProgressError({
      message: 'unexpected error: session_already_in_progress (SQLSTATE P0001)',
    })).toBe(true)
  })

  it('no confunde otros fallos con este', () => {
    expect(isSessionAlreadyInProgressError({ message: 'network error', code: '500' })).toBe(false)
    expect(isSessionAlreadyInProgressError({ message: 'permission denied', code: '42501' })).toBe(false)
  })

  it('aguanta un error sin forma', () => {
    expect(isSessionAlreadyInProgressError(null)).toBe(false)
    expect(isSessionAlreadyInProgressError(undefined)).toBe(false)
    expect(isSessionAlreadyInProgressError({})).toBe(false)
  })
})
