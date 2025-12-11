import { useState, useEffect } from 'react'
import useWorkoutStore from '../../stores/workoutStore.js'
import { NotesBadge } from '../ui/index.js'
import SetCompleteModal from './SetCompleteModal.jsx'
import SetNotesView from './SetNotesView.jsx'
import { WeightRepsInputs, RepsOnlyInputs, TimeInputs, DistanceInputs } from './SetInputs.jsx'
import { isSetDataValid } from '../../lib/setUtils.js'
import { usePreferences } from '../../hooks/usePreferences.js'
import { useCanUploadVideo } from '../../hooks/useAuth.js'

function SetRow({
  setNumber,
  sessionExerciseId,
  exerciseId,
  measurementType = 'weight_reps',
  weightUnit = 'kg',
  descansoSeg,
  previousSet,
  onComplete,
  onUncomplete,
  canRemove = false,
  onRemove
}) {
  const isCompleted = useWorkoutStore(state => state.isSetCompleted(sessionExerciseId, setNumber))
  const setData = useWorkoutStore(state => state.getSetData(sessionExerciseId, setNumber))
  const cachedData = useWorkoutStore(state => state.getCachedSetData(sessionExerciseId, setNumber))

  const { data: preferences } = usePreferences()
  const canUploadVideo = useCanUploadVideo()

  const showRirInput = preferences?.show_rir_input ?? true
  const showSetNotes = preferences?.show_set_notes ?? true
  const showVideoUpload = preferences?.show_video_upload ?? true
  const showVideo = canUploadVideo && showVideoUpload
  const shouldShowModal = showRirInput || showSetNotes || showVideo

  const [weight, setWeight] = useState(setData?.weight ?? '')
  const [reps, setReps] = useState(setData?.repsCompleted ?? '')
  const [time, setTime] = useState(setData?.timeSeconds ?? '')
  const [distance, setDistance] = useState(setData?.distanceMeters ?? '')
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showNotesView, setShowNotesView] = useState(false)

  // Cargar valores de sesión anterior
  useEffect(() => {
    if (previousSet && !setData) {
      if (previousSet.weight) setWeight(previousSet.weight)
      if (previousSet.reps) setReps(previousSet.reps)
      if (previousSet.timeSeconds) setTime(previousSet.timeSeconds)
      if (previousSet.distanceMeters) setDistance(previousSet.distanceMeters)
    }
  }, [previousSet, setData])

  const isValid = () => isSetDataValid(measurementType, { weight, reps, time, distance })

  const handleCheckClick = () => {
    if (isCompleted) {
      onUncomplete({ sessionExerciseId, setNumber })
    } else if (isValid()) {
      if (shouldShowModal) {
        setShowCompleteModal(true)
      } else {
        // Completar directamente sin modal
        handleCompleteSet(null, null, null)
      }
    }
  }

  const handleCompleteSet = (rir, notes, videoUrl) => {
    const data = { sessionExerciseId, exerciseId, setNumber, rirActual: rir, notes, videoUrl }

    switch (measurementType) {
      case 'weight_reps':
        data.weight = parseFloat(weight)
        data.weightUnit = weightUnit
        data.repsCompleted = parseInt(reps)
        break
      case 'reps_only':
      case 'reps_per_side':
        data.repsCompleted = parseInt(reps)
        break
      case 'time':
      case 'time_per_side':
        data.timeSeconds = parseInt(time)
        break
      case 'distance':
        data.distanceMeters = parseFloat(distance)
        if (weight) {
          data.weight = parseFloat(weight)
          data.weightUnit = weightUnit
        }
        break
    }

    onComplete(data, descansoSeg)
    setShowCompleteModal(false)
  }

  const renderInputs = () => {
    const props = { disabled: isCompleted }

    switch (measurementType) {
      case 'weight_reps':
        return <WeightRepsInputs weight={weight} setWeight={setWeight} reps={reps} setReps={setReps} weightUnit={weightUnit} {...props} />
      case 'reps_only':
        return <RepsOnlyInputs reps={reps} setReps={setReps} {...props} />
      case 'time':
        return <TimeInputs time={time} setTime={setTime} {...props} />
      case 'distance':
        return <DistanceInputs weight={weight} setWeight={setWeight} distance={distance} setDistance={setDistance} weightUnit={weightUnit} {...props} />
      default:
        return null
    }
  }

  const hasTextNote = !!setData?.notes
  const hasVideo = !!setData?.videoUrl

  return (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded"
      style={{
        backgroundColor: isCompleted ? 'rgba(63, 185, 80, 0.1)' : '#21262d',
        borderLeft: isCompleted ? '3px solid #3fb950' : '3px solid transparent',
      }}
    >
      <div className="flex items-center gap-2 flex-1">
        {renderInputs()}
      </div>

      {isCompleted && (
        <NotesBadge
          rir={setData?.rirActual}
          hasNotes={hasTextNote}
          hasVideo={hasVideo}
          onClick={(hasTextNote || hasVideo) ? () => setShowNotesView(true) : null}
        />
      )}

      <button
        onClick={handleCheckClick}
        disabled={!isCompleted && !isValid()}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
        style={{
          backgroundColor: isCompleted ? '#3fb950' : '#30363d',
          color: isCompleted ? '#0d1117' : isValid() ? '#3fb950' : '#484f58',
          cursor: (!isCompleted && !isValid()) ? 'default' : 'pointer',
          opacity: (!isCompleted && !isValid()) ? 0.5 : 1,
        }}
        title={isCompleted ? 'Desmarcar serie' : 'Completar serie'}
      >
        {isCompleted ? '✕' : '✓'}
      </button>

      <SetCompleteModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onComplete={handleCompleteSet}
        descansoSeg={descansoSeg}
        initialRir={cachedData?.rirActual}
        initialNote={cachedData?.notes}
        initialVideoUrl={cachedData?.videoUrl}
      />

      <SetNotesView
        isOpen={showNotesView}
        onClose={() => setShowNotesView(false)}
        rir={setData?.rirActual}
        notes={setData?.notes}
        videoUrl={setData?.videoUrl}
      />

      {canRemove && !isCompleted && onRemove && (
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
          style={{ backgroundColor: '#21262d', color: '#f85149' }}
          title="Eliminar serie"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default SetRow
