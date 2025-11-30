import { useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import { useExercises } from '../../hooks/useExercises.js'
import { LoadingSpinner } from '../ui/index.js'

function AddExerciseModal({ isOpen, onClose, onAdd }) {
  const { data: exercises, isLoading } = useExercises()
  const [search, setSearch] = useState('')
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [config, setConfig] = useState({
    series: 3,
    reps: '10',
    rir: 2,
    descanso_seg: 90,
  })

  const filteredExercises = useMemo(() => {
    if (!exercises) return []
    if (!search.trim()) return exercises

    const searchLower = search.toLowerCase()
    return exercises.filter(e =>
      e.nombre.toLowerCase().includes(searchLower) ||
      e.equipment?.nombre?.toLowerCase().includes(searchLower)
    )
  }, [exercises, search])

  if (!isOpen) return null

  const handleAdd = () => {
    if (!selectedExercise) return
    onAdd(selectedExercise, config)
    handleClose()
  }

  const handleClose = () => {
    setSearch('')
    setSelectedExercise(null)
    setConfig({ series: 3, reps: '10', rir: 2, descanso_seg: 90 })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl max-h-[85vh] flex flex-col"
        style={{ backgroundColor: '#161b22' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 flex justify-between items-center shrink-0"
          style={{ borderBottom: '1px solid #30363d' }}
        >
          <h3 className="font-bold" style={{ color: '#e6edf3' }}>
            {selectedExercise ? 'Configurar ejercicio' : 'Añadir ejercicio'}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:opacity-80"
            style={{ backgroundColor: '#21262d' }}
          >
            <X size={20} style={{ color: '#8b949e' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <LoadingSpinner />
          ) : selectedExercise ? (
            // Configuration form
            <div className="space-y-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: '#21262d' }}
              >
                <p className="font-medium" style={{ color: '#e6edf3' }}>
                  {selectedExercise.nombre}
                </p>
                {selectedExercise.equipment?.nombre && (
                  <p className="text-sm" style={{ color: '#8b949e' }}>
                    {selectedExercise.equipment.nombre}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1" style={{ color: '#8b949e' }}>
                    Series
                  </label>
                  <input
                    type="number"
                    value={config.series}
                    onChange={(e) => setConfig(c => ({ ...c, series: parseInt(e.target.value) || 1 }))}
                    min="1"
                    max="10"
                    className="w-full p-3 rounded-lg text-center text-lg font-medium"
                    style={{
                      backgroundColor: '#21262d',
                      border: '1px solid #30363d',
                      color: '#e6edf3',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: '#8b949e' }}>
                    Reps
                  </label>
                  <input
                    type="text"
                    value={config.reps}
                    onChange={(e) => setConfig(c => ({ ...c, reps: e.target.value }))}
                    placeholder="10"
                    className="w-full p-3 rounded-lg text-center text-lg font-medium"
                    style={{
                      backgroundColor: '#21262d',
                      border: '1px solid #30363d',
                      color: '#e6edf3',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: '#8b949e' }}>
                    RIR
                  </label>
                  <input
                    type="number"
                    value={config.rir}
                    onChange={(e) => setConfig(c => ({ ...c, rir: parseInt(e.target.value) }))}
                    min="0"
                    max="5"
                    className="w-full p-3 rounded-lg text-center text-lg font-medium"
                    style={{
                      backgroundColor: '#21262d',
                      border: '1px solid #30363d',
                      color: '#e6edf3',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: '#8b949e' }}>
                    Descanso (s)
                  </label>
                  <input
                    type="number"
                    value={config.descanso_seg}
                    onChange={(e) => setConfig(c => ({ ...c, descanso_seg: parseInt(e.target.value) || 60 }))}
                    step="15"
                    min="30"
                    max="300"
                    className="w-full p-3 rounded-lg text-center text-lg font-medium"
                    style={{
                      backgroundColor: '#21262d',
                      border: '1px solid #30363d',
                      color: '#e6edf3',
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedExercise(null)}
                  className="flex-1 py-3 rounded-lg font-medium"
                  style={{ backgroundColor: '#21262d', color: '#8b949e' }}
                >
                  Atrás
                </button>
                <button
                  onClick={handleAdd}
                  className="flex-1 py-3 rounded-lg font-medium"
                  style={{ backgroundColor: '#238636', color: '#ffffff' }}
                >
                  Añadir
                </button>
              </div>
            </div>
          ) : (
            // Exercise list
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#8b949e' }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg"
                  style={{
                    backgroundColor: '#21262d',
                    border: '1px solid #30363d',
                    color: '#e6edf3',
                  }}
                  autoFocus
                />
              </div>

              {/* Exercise list */}
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {filteredExercises.length === 0 ? (
                  <p className="text-center py-4" style={{ color: '#8b949e' }}>
                    No se encontraron ejercicios
                  </p>
                ) : (
                  filteredExercises.map(exercise => (
                    <button
                      key={exercise.id}
                      onClick={() => setSelectedExercise(exercise)}
                      className="w-full text-left p-3 rounded-lg hover:opacity-80 transition-colors"
                      style={{ backgroundColor: '#21262d' }}
                    >
                      <p className="font-medium" style={{ color: '#e6edf3' }}>
                        {exercise.nombre}
                      </p>
                      {exercise.equipment?.nombre && (
                        <p className="text-sm" style={{ color: '#8b949e' }}>
                          {exercise.equipment.nombre}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AddExerciseModal
