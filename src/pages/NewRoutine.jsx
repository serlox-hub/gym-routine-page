import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus } from 'lucide-react'
import { ErrorMessage, Card } from '../components/ui/index.js'
import { useCreateRoutine } from '../hooks/useRoutines.js'
import { colors, inputStyle } from '../lib/styles.js'

function NewRoutine() {
  const navigate = useNavigate()
  const createRoutine = useCreateRoutine()

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    objetivo: '',
  })

  const [error, setError] = useState(null)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    try {
      const newRoutine = await createRoutine.mutateAsync({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        objetivo: form.objetivo.trim() || null,
      })
      navigate(`/routine/${newRoutine.id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <header className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm mb-4 hover:opacity-80"
          style={{ color: colors.accent }}
        >
          <ChevronLeft size={16} />
          Volver
        </button>
        <h1 className="text-2xl font-bold">Nueva rutina</h1>
      </header>

      {error && <ErrorMessage message={error} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Nombre *
          </label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            placeholder="Ej: Push Pull Legs"
            className="w-full p-3 rounded-lg text-base"
            style={inputStyle}
          />
        </Card>

        <Card className="p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Descripción (opcional)
          </label>
          <textarea
            value={form.descripcion}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            placeholder="Descripción de la rutina..."
            rows={2}
            className="w-full p-3 rounded-lg text-base resize-none"
            style={inputStyle}
          />
        </Card>

        <Card className="p-4">
          <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Objetivo (opcional)
          </label>
          <input
            type="text"
            value={form.objetivo}
            onChange={(e) => handleChange('objetivo', e.target.value)}
            placeholder="Ej: Hipertrofia, Fuerza, Recomposición..."
            className="w-full p-3 rounded-lg text-base"
            style={inputStyle}
          />
        </Card>


        <button
          type="submit"
          disabled={createRoutine.isPending}
          className="w-full py-4 rounded-lg font-medium text-lg transition-colors flex items-center justify-center gap-2"
          style={{
            backgroundColor: colors.success,
            color: '#ffffff',
            opacity: createRoutine.isPending ? 0.7 : 1,
          }}
        >
          {createRoutine.isPending ? (
            'Guardando...'
          ) : (
            <>
              <Plus size={20} />
              Crear rutina
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default NewRoutine
