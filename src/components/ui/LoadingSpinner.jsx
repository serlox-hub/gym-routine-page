function LoadingSpinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="w-8 h-8 border-2 border-secondary border-t-accent rounded-full animate-spin" />
    </div>
  )
}

export default LoadingSpinner
