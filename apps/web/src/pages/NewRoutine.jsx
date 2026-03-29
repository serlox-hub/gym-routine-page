import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { ErrorMessage, Card, PageHeader, Input, Textarea } from '../components/ui/index.js'
import { useCreateRoutine } from '../hooks/useRoutines.js'
import { colors } from '../lib/styles.js'
import { prepareRoutineData, validateRoutineForm } from '@gym/shared'

function NewRoutine() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const createRoutine = useCreateRoutine()

  const [form, setForm] = useState({
    name: '',
    description: '',
    goal: '',
  })

  const [error, setError] = useState(null)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const validation = validateRoutineForm(form)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    try {
      const data = prepareRoutineData(form)
      const newRoutine = await createRoutine.mutateAsync(data)
      navigate(`/routine/${newRoutine.id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <PageHeader title={t('routine:new')} onBack={() => navigate(-1)} />

      {error && <ErrorMessage message={error} className="mb-4" />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-4">
          <Input
            label={`${t('routine:name')} *`}
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ej: Push Pull Legs"
          />
        </Card>

        <Card className="p-4">
          <Textarea
            label={`${t('routine:description')} (${t('common:labels.optional')})`}
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={`${t('routine:description')}...`}
            rows={2}
          />
        </Card>

        <Card className="p-4">
          <Input
            label={`${t('routine:goal')} (${t('common:labels.optional')})`}
            type="text"
            value={form.goal}
            onChange={(e) => handleChange('goal', e.target.value)}
            placeholder={t('routine:goalPlaceholder')}
          />
        </Card>


        <button
          type="submit"
          disabled={createRoutine.isPending}
          className="w-full py-4 rounded-lg font-medium text-lg transition-colors flex items-center justify-center gap-2"
          style={{
            backgroundColor: colors.success,
            color: colors.white,
            opacity: createRoutine.isPending ? 0.7 : 1,
          }}
        >
          {createRoutine.isPending ? (
            t('common:buttons.loading')
          ) : (
            <>
              <Plus size={20} />
              {t('routine:create')}
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default NewRoutine
