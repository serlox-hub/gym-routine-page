function Card({ children, className = '', onClick }) {
  const clickableClasses = onClick ? 'cursor-pointer transition-colors' : ''

  return (
    <div
      className={`rounded-lg ${clickableClasses} ${className}`}
      style={{
        backgroundColor: '#161b22',
        borderWidth: '1px',
        borderColor: '#30363d'
      }}
      onMouseEnter={onClick ? (e) => e.currentTarget.style.backgroundColor = '#1c2128' : undefined}
      onMouseLeave={onClick ? (e) => e.currentTarget.style.backgroundColor = '#161b22' : undefined}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export default Card
