import { useState, useRef, useEffect } from 'react'
import { getNotifier } from '../notifications.js'
import { t } from '../i18n/index.js'
import { getSetFieldValues, buildSetFieldsPayload } from '../lib/setColumns.js'
import { SetField, distanceToMeters, metersToDistanceUnit } from '../lib/measurementFields.js'
import { useUpsertCompletedSet } from './useWorkoutHistory.js'

/**
 * Estado y persistencia de la edición de una serie desde el HISTORIAL (sesión ya cerrada, NO la
 * activa) — contraparte de `useSetInputs` para `SessionInlineDetail`. `EditableSetRow` estaba
 * duplicado byte a byte entre web y native; toda la lógica vive aquí y las apps se quedan solo
 * con JSX (regla DRY del CLAUDE.md). `uploadVideo` llega YA adaptado a la plataforma (native pasa
 * el archivo por `.uri`, web lo pasa tal cual) — mismo patrón de inyección que `useSetVideoUpload`.
 *
 * NO reutiliza `useSetVideoUpload`: ese hook lee el `sessionId` de la sesión ACTIVA del store, y
 * aquí se edita una sesión arbitraria pasada por prop — usarlo escribiría contra la sesión
 * equivocada (o contra `null` sin sesión activa). `useUpsertCompletedSet` sí acepta cualquier
 * `sessionId` explícito, así que sirve para editar cualquier sesión pasada.
 *
 * Owns its write and whether the details sheet is open, because where a failed write shows depends
 * on it (issue #175): inside the open sheet, since on native the toast paints under a React Native
 * `Modal`; otherwise as a toast. The sheet's own write is the last one made while it is open, matched
 * by reference against the mutation's `variables` (same pattern as `useAddSessionExerciseAttempt`).
 *
 * `videoUrl`/`notes` (como `rir`/`setType`) viven en estado LOCAL, no se leen de
 * `set.video_url`/`set.notes` en cada escritura: esas props solo se refrescan tras el refetch que
 * sigue a una mutación, así que una edición de RIR/tipo/vídeo/valor lanzada en esa ventana pisaría
 * una nota o un vídeo recién guardados con el dato viejo.
 *
 * @param {{set: Object, columns: Array, distanceUnit?: string, sessionId: string|number,
 *   sessionExerciseId: string|number,
 *   uploadVideo: (file: any, onProgress: (pct: number) => void) => Promise<string>}} params
 */
export function useHistorySetEditor({ set, columns, distanceUnit, sessionId, sessionExerciseId, uploadVideo }) {
  const [values, setValues] = useState(() => getSetFieldValues(set, columns))
  const [rir, setRir] = useState(set.rir_actual ?? null)
  const [setType, setSetType] = useState(set.set_type ?? 'normal')
  const [videoUrl, setVideoUrl] = useState(set.video_url ?? null)
  const [notes, setNotes] = useState(set.notes ?? null)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoUploadError, setVideoUploadError] = useState(false)
  const [pendingVideoFile, setPendingVideoFile] = useState(null)
  // Descarta el resultado de una subida superada (se quita el vídeo, o se elige otro archivo,
  // antes de que la subida en vuelo resuelva) — mismo patrón de guard que `useSetVideoUpload`.
  const uploadTokenRef = useRef(0)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [sheetAttempt, setSheetAttempt] = useState(null)
  // Mirrors for what runs outside render: `shouldToastError`, and the write after a video upload.
  const isSheetOpenRef = useRef(false)
  const sheetAttemptRef = useRef(null)
  const upsertSet = useUpsertCompletedSet({
    shouldToastError: (_, variables) => variables !== sheetAttemptRef.current,
  })

  // Unmounted, nobody shows the failure inline: it is toasted.
  useEffect(() => () => { sheetAttemptRef.current = null }, [])

  // Re-siembra la distancia cuando cambia la unidad de DISPLAY (p. ej. la query de
  // `useResolvedDistanceUnit` resuelve un tick después del montaje, o el usuario cambia el
  // override con la fila abierta). El valor local se CONVIERTE a la unidad nueva en vez de
  // re-sembrarse desde `set` para no descartar una edición sin commitear todavía — mismo patrón
  // que `useSetInputs`. Sin esto, un blur tras el cambio de unidad reinterpreta el número viejo en
  // la unidad nueva y escribe en BD el valor multiplicado (o dividido) por mil.
  const lastDistanceUnitRef = useRef(distanceUnit)
  useEffect(() => {
    const previousUnit = lastDistanceUnitRef.current
    if (distanceUnit === previousUnit) return
    lastDistanceUnitRef.current = distanceUnit
    setValues(current => {
      const currentValue = current[SetField.DISTANCE]
      if (currentValue === '' || currentValue == null) return current
      return { ...current, [SetField.DISTANCE]: metersToDistanceUnit(distanceToMeters(currentValue, previousUnit), distanceUnit) }
    })
  }, [distanceUnit])

  const openSheet = () => {
    isSheetOpenRef.current = true
    setIsSheetOpen(true)
  }

  // A failure that arrives after closing is toasted.
  const closeSheet = () => {
    isSheetOpenRef.current = false
    sheetAttemptRef.current = null
    setIsSheetOpen(false)
    setSheetAttempt(null)
  }

  const save = (payload) => {
    if (isSheetOpenRef.current) {
      sheetAttemptRef.current = payload
      setSheetAttempt(payload)
    }
    upsertSet.mutate(payload)
  }

  const isOwnSheetSave = sheetAttempt != null && upsertSet.variables === sheetAttempt

  // Solo los campos del ejercicio: las columnas que no viajan en el payload no se tocan en el upsert.
  const buildPayload = (overrides = {}) => ({
    sessionId,
    sessionExerciseId,
    setNumber: set.set_number,
    ...buildSetFieldsPayload(values, columns),
    rirActual: rir,
    notes,
    videoUrl,
    setType,
    ...overrides,
  })

  // Solo escribe si el valor cambió: `onCommit` salta en CADA blur (incluido enfocar y salir sin
  // tocar nada), y tabular por una sesión son decenas de upserts inútiles en red lenta. `set` llega
  // fresco tras la invalidación, así que sirve de referencia de lo ya guardado.
  // ⚠️ Comparar el payload YA parseado, no lo tecleado: "82.50" y 82.5 son el mismo dato guardado,
  // pero como strings nunca coincidirían y cada blur repetiría la escritura para siempre.
  const handleSave = () => {
    const next = buildSetFieldsPayload(values, columns)
    const stored = buildSetFieldsPayload(getSetFieldValues(set, columns), columns)
    if (Object.keys(next).some(key => next[key] !== stored[key])) save(buildPayload())
  }

  // RIR y tipo de serie se fijan desde la hoja de detalles (mismos controles que la sesión activa,
  // `SetDetailsModal`), persistiendo en vivo — paridad con sesión.
  const handleRirChange = (value) => {
    setRir(value)
    save(buildPayload({ rirActual: value }))
  }

  const handleSetTypeChange = (newType) => {
    setSetType(newType)
    save(buildPayload({ setType: newType }))
  }

  const handleSelectVideo = async (file) => {
    const token = ++uploadTokenRef.current
    setIsUploadingVideo(true)
    setUploadProgress(0)
    setVideoUploadError(false)
    setPendingVideoFile(file)
    try {
      const uploadedUrl = await uploadVideo(file, setUploadProgress)
      if (token !== uploadTokenRef.current) return
      setVideoUrl(uploadedUrl)
      save(buildPayload({ videoUrl: uploadedUrl }))
      setPendingVideoFile(null)
    } catch (err) {
      if (token !== uploadTokenRef.current) return
      // eslint-disable-next-line no-console
      console.error('Video upload failed:', err)
      setVideoUploadError(true)
      getNotifier()?.show(t('workout:set.videoUploadError'), 'error')
    } finally {
      if (token === uploadTokenRef.current) setIsUploadingVideo(false)
    }
  }

  const handleRetryVideoUpload = () => {
    if (pendingVideoFile) handleSelectVideo(pendingVideoFile)
  }

  // Quitar vídeo (desde la hoja): descarta cualquier subida en curso (token) y borra en BD. La
  // serie en historial SIEMPRE está completada, así que a diferencia de sesión (`useSetVideoUpload`)
  // no hay rama "aún no escrito" que distinguir.
  const handleRemoveVideo = () => {
    uploadTokenRef.current += 1
    setIsUploadingVideo(false)
    setUploadProgress(0)
    setVideoUploadError(false)
    setPendingVideoFile(null)
    setVideoUrl(null)
    save(buildPayload({ videoUrl: null }))
  }

  // Al cerrar la hoja: RIR, tipo y vídeo ya persistieron en vivo; el cierre solo autoguarda la
  // nota, igual que en sesión.
  const handleNotesSubmit = ({ notes: nextNotes }) => {
    setNotes(nextNotes)
    save(buildPayload({ notes: nextNotes }))
  }

  return {
    values, setValues,
    rir, setType, videoUrl, notes,
    hasVideo: !!videoUrl,
    hasRir: rir != null,
    hasNotes: !!notes,
    isUploadingVideo, uploadProgress, videoUploadError,
    isSheetOpen, openSheet, closeSheet,
    isSheetSaving: isOwnSheetSave && upsertSet.isPending,
    sheetSaveFailed: isOwnSheetSave && upsertSet.isError,
    handleSave,
    handleRirChange,
    handleSetTypeChange,
    handleSelectVideo,
    handleRetryVideoUpload,
    handleRemoveVideo,
    handleNotesSubmit,
  }
}
