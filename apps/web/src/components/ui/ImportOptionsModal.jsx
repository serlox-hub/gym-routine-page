import { useState } from 'react'
import Button from './Button.jsx'
import Modal from './Modal.jsx'
import { colors } from '../../lib/styles.js'

function ImportOptionsModal({ isOpen, onConfirm, onCancel }) {
  const [updateExercises, setUpdateExercises] = useState(false)

  const handleConfirm = () => {
    onConfirm({ updateExercises })
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="p-6">
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
        Opciones de importación
      </h3>
      <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
        Configura cómo quieres importar la rutina
      </p>

      <label
        className="flex items-start gap-3 p-3 rounded-lg cursor-pointer mb-6"
        style={{ backgroundColor: colors.bgSecondary }}
      >
        <input
          type="checkbox"
          checked={updateExercises}
          onChange={(e) => setUpdateExercises(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded"
        />
        <div>
          <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
            Actualizar ejercicios existentes
          </span>
          <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
            Si un ejercicio ya existe, actualiza sus instrucciones y grupo muscular con los datos del archivo
          </p>
        </div>
      </label>

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleConfirm}>
          Importar
        </Button>
      </div>
    </Modal>
  )
}

export default ImportOptionsModal
