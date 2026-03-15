import { Dumbbell } from 'lucide-react'
import { colors } from '../../lib/styles.js'

function Footer() {
  return (
    <footer className="py-8" style={{ borderTop: `1px solid ${colors.bgTertiary}` }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Dumbbell size={16} style={{ color: colors.accent }} />
          <span className="text-sm font-semibold" style={{ color: colors.textSecondary }}>Diario Gym</span>
        </div>
        <p className="text-xs" style={{ color: colors.textMuted }}>
          © {new Date().getFullYear()} Diario Gym. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}

export default Footer
