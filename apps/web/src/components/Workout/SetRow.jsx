import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, AlertCircle, Trophy } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { LoadingSpinner } from '../ui/index.js'
import { useIsPRSet } from './PRContext.jsx'
import SetDetailsModal from './SetDetailsModal.jsx'
import EffortPicker from './EffortPicker.jsx'
import SetValueInput from './SetInputs.jsx'
import SetRowMeta from './SetRowMeta.jsx'
import {
  DEFAULT_TRACKED_FIELDS,
  buildCompletedSetData,
  useSetInputs,
  useSetVideoUpload,
  shouldSuggestProgression,
  shouldShowAnnotationColumn,
  getSetColumns,
  tracksTime,
  effortRendersAsWord,
} from '@gym/shared'
import { usePreferences } from '../../hooks/usePreferences.js'
import { uploadVideo } from '../../lib/videoStorage.js'

// Layout columnar (tipo hoja de cálculo, patrón Strong/Hevy): SET · [valores] · [NOTAS] · ✓.
// MISMO grid mida lo que mida el ejercicio: las columnas de valor (1 a 3) las decide
// `getSetColumns(trackedFields)` y su unidad va en la CABECERA (ver SetsList), no dentro de la
// fila. Es lo que permite que la fila lleve solo inputs `w-full` en tracks `minmax(0,1fr)`, que
// no pueden desbordar por construcción. Ver docs/DECISIONS.md.
// La celda SET es la identidad de la serie (nº / «D» dropset) y es SIEMPRE inerte: la entrada a
// la anotación (RIR + nota + vídeo) es el chip de la columna «Notas» (ver EffortPicker), que
// lleva el glifo/punto de detalle. La columna «Notas» existe si hay algo que anotar (RIR, notas o
// vídeo activados; ver shouldShowAnnotationColumn); se colapsa solo si se apagan las tres prefs.
// La referencia de la última sesión NO es columna: vive en la subfila SetRowMeta junto al aviso
// de progresión y al timer, siempre en el mismo sitio (antes ocupaba 46px fijos, que con 3
// columnas de valor dejaban los inputs a ~26px).
// Fuente única del grid (SetsList importa este helper para su cabecera → sin desincronizar).
// Anchos afinados para móvil (360-390px): las columnas fijas se comen el hueco de los valores.
// ✓ y «Notas» = 44px = área táctil mínima recomendada (issue #10): NO bajar de ahí (choca con
// a11y); si falta ancho, recortar antes SET/gap. Las columnas de valor (1fr) absorben el
// resto y NUNCA desbordan. Aritmética del reparto en `MAX_TRACKED_FIELDS` (lib/measurementFields.js).
const COL_SET = 32 // cabe el chip «D» de dropset (26px)
const COL_EFFORT = 44
// La escala RPE pinta PALABRAS ("Moderado" = 51px a 10px + padding), no "@2": su columna necesita
// más ancho o el chip se sale de la celda. Ver EffortPicker.
const COL_EFFORT_WORD = 62
const COL_CHECK = 44
export const SET_ROW_GAP = 6
// Barra izquierda de "hecho" (lima) que llevan TODAS las filas, transparente en las no completadas
// para no descuadrar. La cabecera la compensa con el mismo padding o quedaría 3px desplazada.
export const SET_ROW_ACCENT = 3

/**
 * Plantilla de columnas del grid de la fila (y de la cabecera de SetsList).
 * @param {number} valueColumns - columnas de valor del ejercicio (1 a 3)
 * @param {boolean} annotationColumn - ¿hay columna «Notas»?
 * @param {boolean} wordEffort - la columna «Notas» muestra palabras (escala RPE), no "@2"
 */
export function getSetGridTemplate(valueColumns, annotationColumn, wordEffort = false) {
  const values = Array.from({ length: valueColumns }, () => 'minmax(0, 1fr)').join(' ')
  const effort = annotationColumn ? ` ${wordEffort ? COL_EFFORT_WORD : COL_EFFORT}px` : ''
  return `${COL_SET}px ${values}${effort} ${COL_CHECK}px`
}

function SetRow({
  setNumber,
  totalSets,
  exerciseName,
  sessionExerciseId,
  exerciseId,
  trackedFields = DEFAULT_TRACKED_FIELDS,
  weightUnit = 'kg',
  distanceUnit = 'm',
  descansoSeg,
  previousSet,
  previousLoaded = false,
  target,
  targetField = null,
  levelTarget = null,
  effortTarget = null,
  progressionEnabled = false,
  isActive = false,
  onComplete,
  onUncomplete,
}) {
  const { t } = useTranslation()
  const isPR = useIsPRSet(sessionExerciseId, setNumber)

  // Estado + persistencia de inputs (compartido web/native; ver useSetInputs)
  const {
    weight, setWeight, reps, setReps, time, setTime, distance, setDistance,
    calories, setCalories, level, setLevel, pace, setPace,
    rir, setRir,
    notes, setType, saveDetails, setSetType,
    isCompleted, setData, isValid, targetPlaceholder, targetField: resolvedTargetField, progressableValue,
  } = useSetInputs({ sessionExerciseId, setNumber, exerciseId, trackedFields, weightUnit, distanceUnit, previousSet, previousLoaded, target, targetField, levelTarget })

  const { data: preferences } = usePreferences()
  const [showModal, setShowModal] = useState(false)

  // Subida de vídeo (issue #31): el archivo elegido en la hoja se sube a MinIO EN CUANTO se
  // elige, complete o no la serie todavía — subir no depende de que exista fila en BD. Si la
  // serie aún no está completada, el resultado se queda en `preCompleteUrl` (solo en memoria,
  // nunca se escribe a `completed_sets`) hasta que el usuario completa: entonces viaja en el
  // MISMO payload de completar (una sola escritura, sin carrera contra la fila sin crear). Si ya
  // estaba completada, el vídeo se adjunta con el UPDATE de siempre. Orquestación compartida
  // web+native en `useSetVideoUpload` — ver docs/DECISIONS.md.
  const {
    isUploading: isUploadingVideo,
    progress: uploadProgress,
    hasError: videoUploadError,
    preCompleteUrl,
    upload: uploadVideoFile,
    retry: retryVideoUpload,
    reset: resetVideoUpload,
    removeVideo,
  } = useSetVideoUpload({ sessionExerciseId, setNumber, uploadVideo })

  const showRirInput = preferences?.show_rir_input ?? true
  // Columna «Notas» (entrada estable de anotación; el número nunca abre nada). Helper compartido
  // con SetsList → cabecera y filas nunca se desincronizan. Se colapsa solo con las 3 prefs off.
  const annotationColumn = shouldShowAnnotationColumn(preferences)

  const handleCheckClick = () => {
    if (isCompleted) {
      onUncomplete({ sessionExerciseId, setNumber })
    } else if (isValid() && !isUploadingVideo) {
      // Un toque: registra la serie (con el RIR inline actual) e inicia el descanso. Bloqueado
      // mientras sube un vídeo elegido en la hoja: completar sin esperar lo dejaría huérfano
      // (ver useSetVideoUpload) — el botón «Completar» de la hoja tiene el mismo guard.
      handleCompleteSet()
    }
  }

  const handleRetryVideoUpload = () => retryVideoUpload({ isCompleted })

  const handleCompleteSet = (notesOverride) => {
    // Incluye los detalles ya fijados inline / en la hoja antes de completar (rir, notas, tipo,
    // y el vídeo si ya terminó de subir — preCompleteUrl). notesOverride: la nota recién tecleada
    // en la hoja aún no está en `notes` (es estado local de la hoja, solo se vuelca al cerrar); al
    // completar desde la hoja se pasa explícita. `null` (nota vaciada) es un override válido →
    // distinguir de undefined (completar desde el check).
    const finalNotes = notesOverride !== undefined ? notesOverride : notes
    const data = buildCompletedSetData(
      trackedFields,
      { weight, reps, time, distance, calories, level, pace },
      { sessionExerciseId, exerciseId, setNumber, weightUnit, distanceUnit, rirActual: rir, notes: finalNotes, setType, videoUrl: preCompleteUrl ?? undefined }
    )
    onComplete(data, descansoSeg, { setNumber, totalSets, exerciseName })
  }

  // Completar desde el botón «Completar» de la hoja: vuelca la nota tecleada al estado local
  // (el chip de la fila queda en sync) y completa con el RIR/tipo vivos + esa nota + el vídeo si
  // ya terminó de subir (`preCompleteUrl`, leído dentro de `handleCompleteSet`). El botón está
  // deshabilitado mientras `isUploadingVideo` (ver SetDetailsModal), así que este handler no
  // puede dispararse a mitad de una subida — cierra la hoja siempre, sin excepciones.
  const handleCompleteFromModal = ({ notes: nextNotes }) => {
    saveDetails({ notes: nextNotes, setType })
    handleCompleteSet(nextNotes)
    setShowModal(false)
  }

  // Elegir un vídeo en la hoja dispara la subida YA (issue #31), complete o no la serie —
  // `useSetVideoUpload` decide el destino según `isCompleted` en ese instante.
  const handleSelectVideo = (file) => uploadVideoFile(file, { isCompleted })

  // Quitar el vídeo desde la hoja: si la serie ya está completada, borra en BD; si no, nunca se
  // escribió nada (pre-completar solo vive en memoria) — basta descartar el estado local.
  const handleRemoveVideoFromModal = () => {
    if (isCompleted) {
      removeVideo()
    } else {
      resetVideoUpload()
    }
  }

  // Al cerrar la hoja: la nota se persiste vía saveDetails (preservando RIR y el tipo actual, que
  // ya se fijó en vivo desde la hoja). RIR y tipo se persistieron en vivo (setRir/setSetType). El
  // vídeo de una serie NO completada ya se disparó al elegirlo (handleSelectVideo) — aquí no hay
  // nada más que hacer con él.
  const handleModalSubmit = ({ notes: nextNotes }) => {
    saveDetails({ notes: nextNotes, setType })
    setShowModal(false)
  }

  // Columnas de valor del ejercicio (1 a 3) + su estado. La cabecera (SetsList) lleva la unidad,
  // así que en la fila solo van inputs desnudos: es lo que deja que encojan sin desbordar.
  const columns = getSetColumns(trackedFields, { weightUnit, distanceUnit })
  const fieldState = {
    weight: [weight, setWeight],
    reps: [reps, setReps],
    time: [time, setTime],
    distance: [distance, setDistance],
    calories: [calories, setCalories],
    level: [level, setLevel],
    pace: [pace, setPace],
  }

  // Detalles desde el estado local (reflejan lo fijado antes o después de completar)
  const hasVideo = !!setData?.videoUrl
  const isDropset = setType === 'dropset'

  // Cuenta atrás de la serie: solo en la fila activa y con una duración ya puesta (sin dato no hay
  // nada que contar). Va en la subfila, fuera del grid: en la fila robaba el ancho de los inputs.
  const showTimer = tracksTime(trackedFields) && isActive && !isCompleted && Number(time) > 0

  // Aviso de progresión (issue #13): esta serie cumplió el objetivo prescrito la última vez.
  // Se oculta al completar la serie o al teclear un progresable mayor que el anterior (nudge
  // cumplido). El progresable es el peso, o el NIVEL en los ejercicios que no miden peso.
  const showProgressionHint = progressionEnabled && !isCompleted &&
    shouldSuggestProgression({ previousSet, target, trackedFields, targetField, currentProgressable: progressableValue, effortTarget })
  // El chip (entrada de anotación) se muestra en la fila activa o completada si la columna existe.
  const showEffort = annotationColumn && (isActive || isCompleted)

  // "Hecho" se marca con lima SÓLIDO (barra izquierda), no con relleno translúcido:
  // el lima #BEFF00 en alpha sobre el navy vira a oliva. Completada y activa comparten
  // relleno neutro sutil; la barra lima distingue lo hecho; la activa muestra sus inputs
  // en caja lima (SetValueInput con active); pendiente = transparente.
  // (Todas llevan 3px de borde izq. transparente para no descuadrar el layout.)
  const baseRowStyle = {
    backgroundColor: (isCompleted || isActive) ? colors.bgHover : 'transparent',
    borderLeft: `${SET_ROW_ACCENT}px solid ${isCompleted ? colors.success : 'transparent'}`,
  }

  const setNumberStyle = {
    textAlign: 'center',
    color: (isActive || isCompleted) ? colors.success : colors.textSecondary,
    fontSize: 14,
    fontWeight: 700,
  }

  const dropChipStyle = {
    backgroundColor: colors.orangeBg,
    color: colors.orange,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 800,
    width: 26,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  // Celda SET: identidad de la serie (número / «D» dropset). SIEMPRE inerte — la entrada a la
  // anotación es el chip de la columna «Notas» (ver EffortPicker), y el punto de nota/vídeo vive
  // en el chip. La celda solo absorbe el estado transitorio de subida de vídeo (%/reintento).
  const renderSetCell = () => {
    if (isUploadingVideo) {
      return <span style={{ color: colors.purple, fontSize: 11, fontWeight: 600 }}>{uploadProgress}%</span>
    }
    if (videoUploadError) {
      return (
        <button onClick={handleRetryVideoUpload} title={t('common:buttons.retry')} aria-label={t('common:buttons.retry')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 44 }}>
          <AlertCircle size={16} color={colors.danger} />
        </button>
      )
    }
    return isDropset
      ? <span style={dropChipStyle}>D</span>
      : <span style={setNumberStyle}>{setNumber}</span>
  }

  const renderCheckIndicator = () => {
    // Botón a 44×44 (área táctil mínima recomendada, issue #10); el icono conserva su tamaño
    // visual (26/22px) centrado. Cabe en la fila sin crecer: py-1 + 44px ≈ la altura previa.
    if (isCompleted) {
      return (
        <button
          onClick={handleCheckClick}
          className="w-11 h-11 flex items-center justify-center hover:opacity-80"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          title={t('workout:set.unmark')}
          aria-label={t('workout:set.unmark')}
        >
          {isPR ? (
            // 22px iguala el diámetro relleno real del CheckCircle2 (size=26 → r=10 en viewbox 24)
            <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={14} color={colors.bgPrimary} strokeWidth={2.5} />
            </div>
          ) : (
            <CheckCircle2 size={26} color={colors.bgPrimary} fill={colors.success} strokeWidth={2.5} />
          )}
        </button>
      )
    }
    // Cualquier fila con datos válidos se puede completar; isActive solo colorea el borde.
    // Bloqueado (disabled real, transitorio) mientras sube un vídeo elegido en la hoja — completar
    // sin esperar lo dejaría huérfano (issue #31, ver useSetVideoUpload); se pinta con spinner.
    const valid = isValid()
    const blocked = !valid || isUploadingVideo
    return (
      <button
        onClick={handleCheckClick}
        disabled={blocked}
        className="w-11 h-11 flex items-center justify-center hover:opacity-80"
        style={{ background: 'transparent', border: 'none', cursor: blocked ? 'default' : 'pointer', opacity: blocked ? 0.6 : 1 }}
        title={t('workout:set.complete')}
        aria-label={t('workout:set.complete')}
      >
        {isUploadingVideo
          ? <LoadingSpinner inline />
          : <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isActive ? colors.success : colors.textMuted}`, display: 'inline-block' }} />}
      </button>
    )
  }

  return (
    <>
      <div
        className="grid items-center py-1 px-1 rounded-lg"
        style={{
          gridTemplateColumns: getSetGridTemplate(columns.length, annotationColumn, effortRendersAsWord(trackedFields, showRirInput)),
          gap: SET_ROW_GAP,
          ...baseRowStyle,
        }}
      >
        <div className="flex items-center justify-center">{renderSetCell()}</div>
        {columns.map(({ field, decimal }) => {
          const [value, onChange] = fieldState[field]
          // El objetivo de la rutina se pinta en la columna DE SU CAMPO (issue #28): en un cardio
          // "20min" es la pista de la columna de tiempo, no de la de reps (que no existe).
          // Se pinta CRUDO, tal como lo escribió el usuario ("20min", "20-30min", "5km"), aunque la
          // cabecera diga MM:SS o M: es la prescripción literal y los rangos se ven enteros.
          // Normalizarlo al formato de la caja convertiría "5km" en "5000". No lo "arregles".
          const placeholder = field === resolvedTargetField ? targetPlaceholder : undefined
          return (
            <div key={field} className="flex items-center min-w-0">
              <SetValueInput field={field} decimal={decimal} value={value} onChange={onChange}
                placeholder={placeholder} active={isActive} />
            </div>
          )
        })}
        {annotationColumn && (
          <div className="flex items-center justify-center min-w-0">
            {showEffort && <EffortPicker value={rir} trackedFields={trackedFields} note={notes} hasVideo={hasVideo}
              active={isActive} showEffortScale={showRirInput} onOpenDetails={() => setShowModal(true)} />}
          </div>
        )}
        <div className="flex items-center justify-center">{renderCheckIndicator()}</div>
      </div>

      <SetRowMeta
        previousSet={previousSet}
        trackedFields={trackedFields}
        weightUnit={weightUnit}
        distanceUnit={distanceUnit}
        showRir={showRirInput}
        showProgressionHint={showProgressionHint}
        target={target}
        targetField={targetField}
        timerSeconds={showTimer ? Number(time) : 0}
      />

      <SetDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleModalSubmit}
        onComplete={isCompleted ? undefined : handleCompleteFromModal}
        canComplete={isValid()}
        setNumber={setNumber}
        isUploadingVideo={isUploadingVideo}
        uploadProgress={uploadProgress}
        onSelectVideo={handleSelectVideo}
        onRemoveVideo={handleRemoveVideoFromModal}
        initialNote={notes}
        initialVideoUrl={isCompleted ? setData?.videoUrl : preCompleteUrl}
        rir={rir}
        onRirChange={setRir}
        trackedFields={trackedFields}
        showEffortScale={showRirInput}
        setType={setType}
        onSetTypeChange={setSetType}
      />
    </>
  )
}

export default SetRow
