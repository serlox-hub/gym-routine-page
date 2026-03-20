import { Check, Smartphone, Share, MoreVertical } from 'lucide-react'
import { Card } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function InstallAppSection() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true

  if (isStandalone) {
    return (
      <Card className="p-4">
        <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
          Aplicación
        </h2>
        <div className="flex items-center gap-2">
          <Check size={16} style={{ color: colors.success }} />
          <p className="text-sm" style={{ color: colors.textPrimary }}>
            App instalada correctamente
          </p>
        </div>
      </Card>
    )
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
        Aplicación
      </h2>
      <div className="flex items-start gap-3">
        <Smartphone size={20} style={{ color: colors.accent }} className="mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
            Añadir a pantalla de inicio
          </p>
          <p className="text-xs mb-3" style={{ color: colors.textSecondary }}>
            Accede más rápido y úsala como una app nativa
          </p>
          {isIOS ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Share size={14} style={{ color: colors.textSecondary }} />
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Pulsa el botón <strong>Compartir</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: colors.textSecondary }}>→</span>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Selecciona <strong>Añadir a pantalla de inicio</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MoreVertical size={14} style={{ color: colors.textSecondary }} />
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Pulsa el menú del navegador
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: colors.textSecondary }}>→</span>
                <p className="text-xs" style={{ color: colors.textSecondary }}>
                  Selecciona <strong>Añadir a pantalla de inicio</strong> o <strong>Instalar</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default InstallAppSection
