// `inline`: sin padding y pequeño, para vivir dentro de un botón (estado "cargando" de una
// acción). Por defecto sigue siendo el spinner de página que ya usaban las pantallas.
function LoadingSpinner({ className = '', inline = false }) {
  const ring = inline ? 'w-4 h-4' : 'w-8 h-8'
  return (
    <div className={`flex items-center justify-center ${inline ? '' : 'p-8'} ${className}`}>
      {/* border-t-success, no border-t-accent: `accent` no existe como token ni en el
          tailwind.config, así que el aro salía de un solo color y el giro no se veía. */}
      <div className={`${ring} border-2 border-secondary border-t-success rounded-full animate-spin`} />
    </div>
  )
}

export default LoadingSpinner
