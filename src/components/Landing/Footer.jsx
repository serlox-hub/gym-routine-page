import { Dumbbell } from 'lucide-react'

function Footer() {
  return (
    <footer className="py-8" style={{ borderTop: '1px solid #21262d' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Dumbbell size={16} style={{ color: '#58a6ff' }} />
          <span className="text-sm font-semibold" style={{ color: '#8b949e' }}>Diario Gym</span>
        </div>
        <p className="text-xs" style={{ color: '#6e7681' }}>
          © {new Date().getFullYear()} Diario Gym. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}

export default Footer
