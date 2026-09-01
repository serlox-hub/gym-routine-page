import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const updateSetVideoMutate = vi.fn()
vi.mock('./useCompletedSets.js', () => ({
  useUpdateSetVideo: () => ({ mutate: updateSetVideoMutate }),
}))

const showNotifier = vi.fn()
vi.mock('../notifications.js', () => ({
  getNotifier: () => ({ show: showNotifier }),
}))

import { useSetVideoUpload } from './useSetVideoUpload.js'

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('useSetVideoUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('serie completada: al terminar la subida llama a updateSetVideo (UPDATE directo)', async () => {
    const uploadVideo = vi.fn().mockResolvedValue('video-key-1')
    const { result } = renderHook(() => useSetVideoUpload({ sessionExerciseId: 1, setNumber: 1, uploadVideo }))

    act(() => { result.current.upload({ name: 'a.mp4' }, { isCompleted: true }) })
    expect(result.current.isUploading).toBe(true)

    await waitFor(() => expect(result.current.isUploading).toBe(false))

    expect(updateSetVideoMutate).toHaveBeenCalledWith({ sessionExerciseId: 1, setNumber: 1, videoUrl: 'video-key-1' })
    expect(result.current.preCompleteUrl).toBeNull()
  })

  it('serie NO completada: al terminar la subida guarda preCompleteUrl y NO escribe en BD (issue #31)', async () => {
    const uploadVideo = vi.fn().mockResolvedValue('video-key-2')
    const { result } = renderHook(() => useSetVideoUpload({ sessionExerciseId: 1, setNumber: 1, uploadVideo }))

    act(() => { result.current.upload({ name: 'a.mp4' }, { isCompleted: false }) })
    await waitFor(() => expect(result.current.isUploading).toBe(false))

    expect(result.current.preCompleteUrl).toBe('video-key-2')
    expect(updateSetVideoMutate).not.toHaveBeenCalled()
  })

  it('subida fallida: marca hasError, avisa y permite reintentar', async () => {
    const uploadVideo = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce('video-key-3')
    const file = { name: 'a.mp4' }
    const { result } = renderHook(() => useSetVideoUpload({ sessionExerciseId: 1, setNumber: 1, uploadVideo }))

    act(() => { result.current.upload(file, { isCompleted: false }) })
    await waitFor(() => expect(result.current.hasError).toBe(true))
    expect(showNotifier).toHaveBeenCalled()

    act(() => { result.current.retry({ isCompleted: false }) })
    await waitFor(() => expect(result.current.isUploading).toBe(false))

    expect(result.current.preCompleteUrl).toBe('video-key-3')
    expect(result.current.hasError).toBe(false)
  })

  it('rc-1: una segunda subida en la misma serie descarta el resultado de la primera (no hay doble escritura)', async () => {
    const first = deferred()
    const second = deferred()
    const uploadVideo = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useSetVideoUpload({ sessionExerciseId: 1, setNumber: 1, uploadVideo }))

    act(() => { result.current.upload({ name: 'first.mp4' }, { isCompleted: true }) })
    act(() => { result.current.upload({ name: 'second.mp4' }, { isCompleted: true }) })

    // La primera resuelve DESPUÉS de que la segunda ya está en vuelo: su resultado se descarta.
    await act(async () => { first.resolve('key-first') })
    expect(updateSetVideoMutate).not.toHaveBeenCalled()

    await act(async () => { second.resolve('key-second') })
    await waitFor(() => expect(result.current.isUploading).toBe(false))

    expect(updateSetVideoMutate).toHaveBeenCalledTimes(1)
    expect(updateSetVideoMutate).toHaveBeenCalledWith({ sessionExerciseId: 1, setNumber: 1, videoUrl: 'key-second' })
  })

  it('removeVideo() limpia el estado local y borra el vídeo en BD (serie ya completada)', () => {
    const uploadVideo = vi.fn()
    const { result } = renderHook(() => useSetVideoUpload({ sessionExerciseId: 1, setNumber: 1, uploadVideo }))

    act(() => { result.current.removeVideo() })

    expect(updateSetVideoMutate).toHaveBeenCalledWith({ sessionExerciseId: 1, setNumber: 1, videoUrl: null })
    expect(result.current.preCompleteUrl).toBeNull()
    expect(result.current.hasError).toBe(false)
  })

  it('rc-2: una segunda subida en vuelo descarta el FALLO de la primera si esta ya fue superada', async () => {
    const first = deferred()
    const second = deferred()
    const uploadVideo = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useSetVideoUpload({ sessionExerciseId: 1, setNumber: 1, uploadVideo }))

    act(() => { result.current.upload({ name: 'first.mp4' }, { isCompleted: true }) })
    act(() => { result.current.upload({ name: 'second.mp4' }, { isCompleted: true }) })

    // La primera falla DESPUÉS de que la segunda ya está en vuelo: el fallo se descarta (no
    // marca hasError ni avisa por una subida que el usuario ya sustituyó).
    await act(async () => { first.reject(new Error('network')) })
    expect(result.current.hasError).toBe(false)
    expect(showNotifier).not.toHaveBeenCalled()

    await act(async () => { second.resolve('key-second') })
    await waitFor(() => expect(result.current.isUploading).toBe(false))

    expect(updateSetVideoMutate).toHaveBeenCalledTimes(1)
    expect(updateSetVideoMutate).toHaveBeenCalledWith({ sessionExerciseId: 1, setNumber: 1, videoUrl: 'key-second' })
  })

  it('retry() no hace nada si no hay archivo pendiente (nada que reintentar)', () => {
    const uploadVideo = vi.fn()
    const { result } = renderHook(() => useSetVideoUpload({ sessionExerciseId: 1, setNumber: 1, uploadVideo }))

    act(() => { result.current.retry({ isCompleted: true }) })

    expect(uploadVideo).not.toHaveBeenCalled()
    expect(result.current.isUploading).toBe(false)
  })

  it('progress refleja las llamadas al callback de progreso pasado a uploadVideo', async () => {
    let capturedOnProgress
    const pending = deferred()
    const uploadVideo = vi.fn((_file, onProgress) => {
      capturedOnProgress = onProgress
      return pending.promise
    })
    const { result } = renderHook(() => useSetVideoUpload({ sessionExerciseId: 1, setNumber: 1, uploadVideo }))

    act(() => { result.current.upload({ name: 'a.mp4' }, { isCompleted: true }) })
    expect(result.current.progress).toBe(0)

    act(() => { capturedOnProgress(42) })
    expect(result.current.progress).toBe(42)

    await act(async () => { pending.resolve('key') })
    await waitFor(() => expect(result.current.isUploading).toBe(false))
  })

  it('reset() invalida una subida en vuelo (quitar el vídeo antes de que termine)', async () => {
    const pending = deferred()
    const uploadVideo = vi.fn().mockReturnValue(pending.promise)
    const { result } = renderHook(() => useSetVideoUpload({ sessionExerciseId: 1, setNumber: 1, uploadVideo }))

    act(() => { result.current.upload({ name: 'a.mp4' }, { isCompleted: false }) })
    act(() => { result.current.reset() })

    expect(result.current.isUploading).toBe(false)
    expect(result.current.preCompleteUrl).toBeNull()

    await act(async () => { pending.resolve('key-late') })

    expect(result.current.preCompleteUrl).toBeNull()
    expect(updateSetVideoMutate).not.toHaveBeenCalled()
  })
})
