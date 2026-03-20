import { colors } from '../../lib/styles.js'

function PRSummaryModal({ prs, onDismiss }) {
  if (!prs || prs.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-5"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <h3
          className="text-lg font-bold mb-4 text-center"
          style={{ color: colors.warning }}
        >
          Nuevos records personales
        </h3>
        <div className="space-y-3 mb-5">
          {prs.map((pr) => (
            <div key={pr.exerciseId}>
              <div className="text-sm font-semibold mb-1" style={{ color: colors.textPrimary }}>
                {pr.exerciseName}
              </div>
              {pr.details.map((d) => (
                <div key={d.type} className="flex items-center justify-between text-xs" style={{ color: colors.textSecondary }}>
                  <span>{d.label}</span>
                  <span>
                    <span className="font-bold" style={{ color: colors.warning }}>
                      {d.newValue} {d.unit}
                    </span>
                    {d.oldValue > 0 && (
                      <span className="ml-1">
                        (antes: {d.oldValue} · +{d.improvement}%)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-lg font-medium text-sm"
          style={{ backgroundColor: colors.warning, color: '#000' }}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

export default PRSummaryModal
