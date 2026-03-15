function ErrorMessage({ message, className = '' }) {
  return (
    <div className={`p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger ${className}`}>
      {message}
    </div>
  )
}

export default ErrorMessage
