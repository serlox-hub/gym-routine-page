import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const showNotifier = vi.fn()
vi.mock('../notifications.js', () => ({
  getNotifier: () => ({ show: showNotifier }),
}))

vi.mock('../i18n/index.js', () => ({
  t: (key) => key,
}))

import { useHistorySetEditor } from './useHistorySetEditor.js'
import { getSetColumns } from '../lib/setColumns.js'

const COLUMNS = getSetColumns(['weight', 'reps'])
const BASE_SET = { set_number: 1, weight: 80, reps_completed: 8, rir_actual: 2, set_type: 'normal', video_url: null, notes: 'nota' }

function setup({ set = BASE_SET, onUpsert = vi.fn(), uploadVideo = vi.fn() } = {}) {
  const hook = renderHook(() =>
    useHistorySetEditor({
      set,
      columns: COLUMNS,
      sessionId: 'session-1',
      sessionExerciseId: 'ex-1',
      onUpsert,
      uploadVideo,
    })
  )
  return { ...hook, onUpsert, uploadVideo }
}

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('useHistorySetEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleSave', () => {
    it('no llama a onUpsert si nada cambió respecto a `set`', () => {
      const { result, onUpsert } = setup()
      act(() => { result.current.handleSave() })
      expect(onUpsert).not.toHaveBeenCalled()
    })

    it('llama a onUpsert cuando un valor cambió de verdad', () => {
      const { result, onUpsert } = setup()
      act(() => { result.current.setValues({ ...result.current.values, weight: 85 }) })
      act(() => { result.current.handleSave() })

      expect(onUpsert).toHaveBeenCalledTimes(1)
      expect(onUpsert).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 'session-1',
        sessionExerciseId: 'ex-1',
        setNumber: 1,
        weight: 85,
      }))
    })

    it('"82.50" tecleado y 82.5 guardado son el mismo dato: no repite el upsert', () => {
      const { result, onUpsert } = setup({ set: { ...BASE_SET, weight: 82.5 } })
      act(() => { result.current.setValues({ ...result.current.values, weight: '82.50' }) })
      act(() => { result.current.handleSave() })

      expect(onUpsert).not.toHaveBeenCalled()
    })

    it('detecta el cambio en cualquier campo trackeado, no solo el primero', () => {
      const { result, onUpsert } = setup()
      act(() => { result.current.setValues({ ...result.current.values, reps: 12 }) })
      act(() => { result.current.handleSave() })

      expect(onUpsert).toHaveBeenCalledWith(expect.objectContaining({ repsCompleted: 12 }))
    })
  })

  describe('handleRirChange', () => {
    it('persiste el RIR nuevo en vivo', () => {
      const { result, onUpsert } = setup()
      act(() => { result.current.handleRirChange(0) })

      expect(result.current.rir).toBe(0)
      expect(result.current.hasRir).toBe(true)
      expect(onUpsert).toHaveBeenCalledWith(expect.objectContaining({ rirActual: 0 }))
    })

    it('construye el payload desde el setType/videoUrl LOCAL, no desde `set` (no revierte un cambio previo)', () => {
      const { result, onUpsert } = setup({ set: { ...BASE_SET, set_type: 'normal', video_url: null } })

      act(() => { result.current.handleSetTypeChange('dropset') })
      act(() => { result.current.handleRirChange(1) })

      // La segunda llamada (RIR) debe seguir llevando 'dropset', no el 'normal' de la prop `set`.
      expect(onUpsert).toHaveBeenLastCalledWith(expect.objectContaining({ setType: 'dropset', rirActual: 1 }))
    })
  })

  describe('handleSetTypeChange', () => {
    it('persiste el tipo de serie nuevo en vivo', () => {
      const { result, onUpsert } = setup()
      act(() => { result.current.handleSetTypeChange('dropset') })

      expect(result.current.setType).toBe('dropset')
      expect(onUpsert).toHaveBeenCalledWith(expect.objectContaining({ setType: 'dropset' }))
    })

    it('construye el payload desde el RIR local, no desde `set` (no revierte un RIR ya cambiado)', () => {
      const { result, onUpsert } = setup({ set: { ...BASE_SET, rir_actual: 2 } })

      act(() => { result.current.handleRirChange(0) })
      act(() => { result.current.handleSetTypeChange('dropset') })

      expect(onUpsert).toHaveBeenLastCalledWith(expect.objectContaining({ rirActual: 0, setType: 'dropset' }))
    })
  })

  describe('handleSelectVideo — token guard', () => {
    it('sube el vídeo y persiste la URL', async () => {
      const uploadVideo = vi.fn().mockResolvedValue('video-key-1')
      const { result, onUpsert } = setup({ uploadVideo })

      await act(async () => { await result.current.handleSelectVideo({ name: 'a.mp4' }) })

      expect(result.current.videoUrl).toBe('video-key-1')
      expect(result.current.hasVideo).toBe(true)
      expect(onUpsert).toHaveBeenCalledWith(expect.objectContaining({ videoUrl: 'video-key-1' }))
    })

    it('una segunda subida descarta el resultado de la primera (no la clobbers)', async () => {
      const first = deferred()
      const second = deferred()
      const uploadVideo = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      const { result, onUpsert } = setup({ uploadVideo })

      let firstCall, secondCall
      act(() => { firstCall = result.current.handleSelectVideo({ name: 'first.mp4' }) })
      act(() => { secondCall = result.current.handleSelectVideo({ name: 'second.mp4' }) })

      await act(async () => { first.resolve('key-first') })
      // La primera resolvió DESPUÉS de que la segunda ya estaba en vuelo: no debe pisar el estado.
      expect(result.current.videoUrl).not.toBe('key-first')
      expect(onUpsert).not.toHaveBeenCalledWith(expect.objectContaining({ videoUrl: 'key-first' }))

      await act(async () => { second.resolve('key-second') })
      await firstCall
      await secondCall

      expect(result.current.videoUrl).toBe('key-second')
      expect(onUpsert).toHaveBeenCalledTimes(1)
      expect(onUpsert).toHaveBeenCalledWith(expect.objectContaining({ videoUrl: 'key-second' }))
    })

    it('quitar el vídeo mientras una subida está en vuelo descarta su resultado al llegar', async () => {
      const pending = deferred()
      const uploadVideo = vi.fn().mockReturnValue(pending.promise)
      const { result, onUpsert } = setup({ uploadVideo })

      let uploadCall
      act(() => { uploadCall = result.current.handleSelectVideo({ name: 'a.mp4' }) })
      act(() => { result.current.handleRemoveVideo() })

      expect(result.current.videoUrl).toBeNull()
      expect(onUpsert).toHaveBeenLastCalledWith(expect.objectContaining({ videoUrl: null }))
      onUpsert.mockClear()

      await act(async () => { pending.resolve('too-late') })
      await uploadCall

      expect(result.current.videoUrl).toBeNull()
      expect(onUpsert).not.toHaveBeenCalled()
    })

    it('una subida fallida marca error y avisa, sin persistir', async () => {
      const uploadVideo = vi.fn().mockRejectedValue(new Error('network'))
      const { result, onUpsert } = setup({ uploadVideo })

      await act(async () => { await result.current.handleSelectVideo({ name: 'a.mp4' }) })

      expect(result.current.videoUploadError).toBe(true)
      expect(result.current.isUploadingVideo).toBe(false)
      expect(showNotifier).toHaveBeenCalled()
      expect(onUpsert).not.toHaveBeenCalled()
    })

    it('el fallo de una subida superada no marca error ni avisa (se descartó antes)', async () => {
      const first = deferred()
      const second = deferred()
      const uploadVideo = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      const { result } = setup({ uploadVideo })

      let firstCall, secondCall
      act(() => { firstCall = result.current.handleSelectVideo({ name: 'first.mp4' }) })
      act(() => { secondCall = result.current.handleSelectVideo({ name: 'second.mp4' }) })

      await act(async () => { first.reject(new Error('network')) })
      expect(result.current.videoUploadError).toBe(false)
      expect(showNotifier).not.toHaveBeenCalled()

      await act(async () => { second.resolve('key-second') })
      await firstCall
      await secondCall
    })
  })

  describe('handleRemoveVideo', () => {
    it('limpia el estado de vídeo y persiste videoUrl null', () => {
      const { result, onUpsert } = setup({ set: { ...BASE_SET, video_url: 'existing-key' } })
      expect(result.current.hasVideo).toBe(true)

      act(() => { result.current.handleRemoveVideo() })

      expect(result.current.videoUrl).toBeNull()
      expect(result.current.hasVideo).toBe(false)
      expect(onUpsert).toHaveBeenCalledWith(expect.objectContaining({ videoUrl: null }))
    })

    it('construye el payload desde el RIR/setType LOCAL, no desde `set` (no revierte un cambio previo)', () => {
      const { result, onUpsert } = setup({ set: { ...BASE_SET, rir_actual: 2, set_type: 'normal', video_url: 'key' } })

      act(() => { result.current.handleRirChange(0) })
      act(() => { result.current.handleSetTypeChange('dropset') })
      act(() => { result.current.handleRemoveVideo() })

      expect(onUpsert).toHaveBeenLastCalledWith(expect.objectContaining({ rirActual: 0, setType: 'dropset', videoUrl: null }))
    })
  })

  describe('handleNotesSubmit', () => {
    it('persiste las notas nuevas junto al resto del payload local', () => {
      const { result, onUpsert } = setup()
      act(() => { result.current.handleSetTypeChange('dropset') })
      act(() => { result.current.handleNotesSubmit({ notes: 'nueva nota' }) })

      expect(onUpsert).toHaveBeenLastCalledWith(expect.objectContaining({ notes: 'nueva nota', setType: 'dropset' }))
    })

    it('actualiza el estado local notes/hasNotes (no se queda leyendo `set.notes`)', () => {
      const { result } = setup({ set: { ...BASE_SET, notes: 'nota original' } })
      act(() => { result.current.handleNotesSubmit({ notes: 'nota nueva' }) })

      expect(result.current.notes).toBe('nota nueva')
      expect(result.current.hasNotes).toBe(true)
    })

    it('unas notas vaciadas dejan hasNotes en false', () => {
      const { result } = setup({ set: { ...BASE_SET, notes: 'nota original' } })
      act(() => { result.current.handleNotesSubmit({ notes: '' }) })

      expect(result.current.hasNotes).toBe(false)
    })

    it('una acción posterior (RIR) construye el payload desde las notas LOCALES, no desde `set.notes` (que sigue desactualizado hasta el refetch)', () => {
      const { result, onUpsert } = setup({ set: { ...BASE_SET, notes: 'nota vieja' } })

      act(() => { result.current.handleNotesSubmit({ notes: 'nota recién guardada' }) })
      act(() => { result.current.handleRirChange(1) })

      // La llamada del RIR debe seguir llevando la nota recién guardada, no la de la prop `set` stale.
      expect(onUpsert).toHaveBeenLastCalledWith(expect.objectContaining({ notes: 'nota recién guardada', rirActual: 1 }))
    })
  })

  describe('estado inicial', () => {
    it('rir 0 (fallo real) no se pisa como si fuera ausente', () => {
      const { result } = setup({ set: { ...BASE_SET, rir_actual: 0 } })
      expect(result.current.rir).toBe(0)
      expect(result.current.hasRir).toBe(true)
    })

    it('sin RIR guardado, hasRir es false', () => {
      const { result } = setup({ set: { ...BASE_SET, rir_actual: null } })
      expect(result.current.rir).toBeNull()
      expect(result.current.hasRir).toBe(false)
    })
  })

  // La unidad de distancia no está en el primer render (sale de `useResolvedDistanceUnit`, que
  // resuelve un tick después del montaje) y además se puede cambiar con la fila abierta. El
  // componente reconstruye `columns` con la unidad vigente en cada render (ver SessionInlineDetail),
  // así que el test reproduce eso pasando `columns` y `distanceUnit` juntos en cada rerender.
  describe('resync de distanceUnit', () => {
    const DISTANCE_SET = { set_number: 1, distance_meters: 5000 }

    function setupDistance({ set = DISTANCE_SET, distanceUnit = 'm', trackedFields = ['distance'], onUpsert = vi.fn() } = {}) {
      const hook = renderHook(
        (props) =>
          useHistorySetEditor({
            set: props.set,
            columns: getSetColumns(props.trackedFields, { distanceUnit: props.distanceUnit }),
            distanceUnit: props.distanceUnit,
            sessionId: 'session-1',
            sessionExerciseId: 'ex-1',
            onUpsert: props.onUpsert,
            uploadVideo: vi.fn(),
          }),
        { initialProps: { set, distanceUnit, trackedFields, onUpsert } }
      )
      return { ...hook, onUpsert }
    }

    it('convierte el valor local a la unidad nueva cuando distanceUnit cambia tras el montaje', () => {
      const { result, rerender } = setupDistance({ distanceUnit: 'm' })
      expect(result.current.values.distance).toBe(5000)

      rerender({ set: DISTANCE_SET, distanceUnit: 'km', trackedFields: ['distance'], onUpsert: vi.fn() })
      expect(result.current.values.distance).toBe(5)
    })

    it('preserva una edición sin commitear: convierte el valor tecleado, no re-siembra desde `set`', () => {
      const { result, rerender } = setupDistance({ distanceUnit: 'm' })
      act(() => { result.current.setValues({ ...result.current.values, distance: 3000 }) })

      rerender({ set: DISTANCE_SET, distanceUnit: 'km', trackedFields: ['distance'], onUpsert: vi.fn() })

      // 3000 m tecleados -> 3 km. Si re-sembrara desde `set` (5000 m guardados) daría 5, no 3.
      expect(result.current.values.distance).toBe(3)
    })

    it('no toca values.distance cuando el ejercicio no trackea distancia', () => {
      const weightRepsSet = { set_number: 1, weight: 80, reps_completed: 8 }
      const { result, rerender } = setupDistance({ set: weightRepsSet, trackedFields: ['weight', 'reps'], distanceUnit: 'm' })
      expect(result.current.values.distance).toBeUndefined()

      rerender({ set: weightRepsSet, distanceUnit: 'km', trackedFields: ['weight', 'reps'], onUpsert: vi.fn() })

      expect(result.current.values).toEqual({ weight: 80, reps: 8 })
      expect(result.current.values.distance).toBeUndefined()
    })

    it('no hace nada si distanceUnit no cambia entre renders', () => {
      const { result, rerender } = setupDistance({ distanceUnit: 'm' })
      act(() => { result.current.setValues({ ...result.current.values, distance: 1234 }) })

      rerender({ set: DISTANCE_SET, distanceUnit: 'm', trackedFields: ['distance'], onUpsert: vi.fn() })

      expect(result.current.values.distance).toBe(1234)
    })
  })
})
