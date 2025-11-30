# Fase 7: Notas por Serie

## Objetivos
1. Modal SetNotes con selectores rápidos
2. Selector RIR real (0, 1, 2, 3+)
3. Chips sensación (Bien, Normal, Flojo, Molestia)
4. Textarea nota libre
5. Guardar en campo `notas` de completed_sets

---

## Componente SetNotes Modal

### src/features/workout-session/components/SetNotes.jsx
```javascript
import { useState } from 'react'

const RIR_OPTIONS = [
  { value: 0, label: '0', description: 'Al fallo' },
  { value: 1, label: '1', description: 'Casi al fallo' },
  { value: 2, label: '2', description: 'Bien' },
  { value: 3, label: '3+', description: 'Fácil' },
]

const FEELING_OPTIONS = [
  { value: 'bien', label: 'Bien', emoji: '💪' },
  { value: 'normal', label: 'Normal', emoji: '😐' },
  { value: 'flojo', label: 'Flojo', emoji: '😓' },
  { value: 'molestia', label: 'Molestia', emoji: '⚠️' },
]

const PAIN_ZONES = [
  'Codo',
  'Muñeca',
  'Hombro',
  'Espalda baja',
  'Rodilla',
  'Otro'
]

export function SetNotes({ isOpen, onClose, onSave, initialData = {} }) {
  const [rir, setRir] = useState(initialData.rir ?? null)
  const [feeling, setFeeling] = useState(initialData.feeling ?? null)
  const [painZone, setPainZone] = useState(initialData.painZone ?? null)
  const [freeNote, setFreeNote] = useState(initialData.freeNote ?? '')

  const handleSave = () => {
    const notes = []

    if (rir !== null) notes.push(`RIR: ${rir}`)
    if (feeling) notes.push(`Sensación: ${feeling}`)
    if (painZone) notes.push(`Molestia en: ${painZone}`)
    if (freeNote) notes.push(freeNote)

    onSave({
      rir,
      notesText: notes.join(' | ')
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
      <div className="bg-bg-secondary w-full rounded-t-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-bg-secondary p-4 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold">Notas de la serie</h3>
          <button onClick={onClose} className="text-text-secondary">✕</button>
        </div>

        <div className="p-4 space-y-6">
          {/* RIR Real */}
          <div>
            <label className="block text-sm text-text-secondary mb-3">
              RIR Real (Repeticiones en Reserva)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {RIR_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setRir(option.value)}
                  className={`p-3 rounded-lg text-center transition-colors ${
                    rir === option.value
                      ? 'bg-accent text-bg-primary'
                      : 'bg-bg-tertiary'
                  }`}
                >
                  <div className="text-xl font-bold">{option.label}</div>
                  <div className="text-xs opacity-75">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sensación */}
          <div>
            <label className="block text-sm text-text-secondary mb-3">
              Sensación
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FEELING_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setFeeling(option.value)}
                  className={`p-3 rounded-lg text-center transition-colors ${
                    feeling === option.value
                      ? 'bg-accent-green text-bg-primary'
                      : 'bg-bg-tertiary'
                  }`}
                >
                  <div className="text-xl">{option.emoji}</div>
                  <div className="text-xs">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Zona de molestia (solo si seleccionó "Molestia") */}
          {feeling === 'molestia' && (
            <div>
              <label className="block text-sm text-text-secondary mb-3">
                Zona de molestia
              </label>
              <div className="flex flex-wrap gap-2">
                {PAIN_ZONES.map(zone => (
                  <button
                    key={zone}
                    onClick={() => setPainZone(zone)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      painZone === zone
                        ? 'bg-accent-red text-white'
                        : 'bg-bg-tertiary'
                    }`}
                  >
                    {zone}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nota libre */}
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Nota adicional (opcional)
            </label>
            <textarea
              value={freeNote}
              onChange={(e) => setFreeNote(e.target.value)}
              placeholder="Ej: Buen pump, probar más peso la próxima..."
              className="w-full bg-bg-tertiary rounded-lg p-3 text-sm resize-none h-20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-bg-secondary p-4 border-t border-border">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-accent text-bg-primary rounded-lg font-bold"
          >
            Guardar nota
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## Integración en SetTracker

```javascript
// src/features/workout-session/components/SetTracker.jsx
import { useState } from 'react'
import { SetNotes } from './SetNotes'

export function SetTracker({ exercise, setNumber }) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [setNotes, setSetNotes] = useState(null)

  const { completeSet, startRestTimer } = useWorkoutStore()

  const handleComplete = async () => {
    await completeSet(exercise.id, exercise.exerciseId, {
      setNumber,
      weight: parseFloat(weight) || 0,
      reps: parseInt(reps) || 0,
      rir: setNotes?.rir ?? null,
      notes: setNotes?.notesText ?? null
    })

    startRestTimer(exercise.descanso)
    setWeight('')
    setReps('')
    setSetNotes(null)
  }

  const handleSaveNotes = (notes) => {
    setSetNotes(notes)
  }

  return (
    <div>
      {/* ... inputs de peso y reps ... */}

      {/* Indicador de nota añadida */}
      {setNotes && (
        <div className="flex items-center gap-2 text-sm text-accent-green mb-4">
          <span>✓ Nota añadida</span>
          <button
            onClick={() => setShowNotes(true)}
            className="text-accent underline"
          >
            Editar
          </button>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowNotes(true)}
          className="flex-1 py-3 bg-bg-tertiary rounded-lg"
        >
          + Nota
        </button>
        <button
          onClick={handleComplete}
          disabled={!weight || !reps}
          className="flex-2 py-3 bg-accent-green text-bg-primary rounded-lg font-bold disabled:opacity-50"
        >
          ✓ Completar
        </button>
      </div>

      {/* Modal de notas */}
      <SetNotes
        isOpen={showNotes}
        onClose={() => setShowNotes(false)}
        onSave={handleSaveNotes}
        initialData={setNotes}
      />
    </div>
  )
}
```

---

## Nota Rápida (Sin Modal)

Para añadir RIR sin abrir modal completo:

```javascript
export function QuickRirSelector({ value, onChange }) {
  return (
    <div className="flex gap-1">
      <span className="text-xs text-text-secondary mr-2">RIR:</span>
      {[0, 1, 2, 3].map(rir => (
        <button
          key={rir}
          onClick={() => onChange(rir)}
          className={`w-8 h-8 rounded text-sm ${
            value === rir
              ? 'bg-accent text-bg-primary'
              : 'bg-bg-tertiary'
          }`}
        >
          {rir === 3 ? '3+' : rir}
        </button>
      ))}
    </div>
  )
}
```

---

## Mostrar Notas en Historial

```javascript
// En PreviousWorkout o lista de series
export function SetWithNotes({ set }) {
  return (
    <div className="bg-bg-tertiary rounded p-2">
      <div className="flex justify-between">
        <span>{set.weight}kg × {set.reps}</span>
        {set.rir !== null && (
          <span className="text-xs text-accent-purple">RIR {set.rir}</span>
        )}
      </div>
      {set.notes && (
        <p className="text-xs text-text-muted mt-1">{set.notes}</p>
      )}
    </div>
  )
}
```

---

## Tareas

- [ ] Crear componente SetNotes modal
- [ ] Selector de RIR (0, 1, 2, 3+)
- [ ] Selector de sensación con emojis
- [ ] Selector de zona de molestia (condicional)
- [ ] Textarea para nota libre
- [ ] Integrar en SetTracker
- [ ] Indicador visual de nota añadida
- [ ] Crear QuickRirSelector alternativo
- [ ] Mostrar notas en historial
- [ ] Guardar en Supabase (campo notas + rir_actual)
