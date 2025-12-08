import { useState } from 'react'
import { X, ChevronRight, Check } from 'lucide-react'
import { Button, Card } from '../ui/index.js'
import { colors } from '../../lib/styles.js'
import { ROUTINE_TEMPLATES } from '../../lib/routineTemplates.js'

function TemplatesModal({ onClose, onSelect }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.data)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] rounded-lg flex flex-col"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: colors.border }}>
          <h3 className="font-semibold" style={{ color: colors.textPrimary }}>
            Plantillas predefinidas
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-80"
            style={{ color: colors.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            Selecciona una rutina para empezar rápidamente. Podrás personalizarla después.
          </p>
          <div className="space-y-2">
            {ROUTINE_TEMPLATES.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onSelect={() => setSelectedTemplate(template)}
              />
            ))}
          </div>
        </div>

        <div className="p-4 border-t" style={{ borderColor: colors.border }}>
          <Button
            variant="primary"
            className="w-full"
            onClick={handleConfirm}
            disabled={!selectedTemplate}
          >
            Usar plantilla
          </Button>
        </div>
      </div>
    </div>
  )
}

function TemplateCard({ template, isSelected, onSelect }) {
  const daysCount = template.data.routine.days.length

  return (
    <Card
      className={`p-3 transition-all ${isSelected ? 'ring-2' : ''}`}
      style={isSelected ? { ringColor: colors.accent } : {}}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
          style={{
            borderColor: isSelected ? colors.accent : colors.border,
            backgroundColor: isSelected ? colors.accent : 'transparent'
          }}
        >
          {isSelected && <Check size={12} style={{ color: '#fff' }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm" style={{ color: colors.textPrimary }}>
              {template.name}
            </h4>
            <ChevronRight size={16} style={{ color: colors.textSecondary }} className="shrink-0" />
          </div>
          <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
            {template.description}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {template.tags.map(tag => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary }}
              >
                {tag}
              </span>
            ))}
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: colors.bgPrimary, color: colors.textSecondary }}
            >
              {daysCount} {daysCount === 1 ? 'día' : 'días'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default TemplatesModal
