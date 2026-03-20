import { colors } from '../../lib/styles.js'

function PRNotification({ notification, onDismiss }) {
  if (!notification) return null

  const record = notification.records[0]
  const improvementText = record.previousValue
    ? ` (anterior: ${record.previousValue})`
    : ''

  return (
    <>
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg cursor-pointer max-w-sm w-[calc(100%-2rem)]"
        style={{ backgroundColor: colors.warning, color: '#000', animation: 'pr-slide-down 0.3s ease-out' }}
        onClick={onDismiss}
      >
        <div className="font-bold text-sm">Nuevo PR</div>
        <div className="text-xs">
          {notification.exerciseName}: {record.label} {record.value} {record.unit}{improvementText}
        </div>
      </div>
      <style>{`
        @keyframes pr-slide-down {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </>
  )
}

export default PRNotification
