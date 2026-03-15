import { useState } from 'react'
import { colors } from '../../lib/styles.js'

const MAX_CHARS = 80

function TruncatedText({ text, maxChars = MAX_CHARS, className = '', style = {} }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!text) return null

  const needsTruncation = text.length > maxChars
  const displayText = needsTruncation && !isExpanded
    ? text.slice(0, maxChars).trim() + '...'
    : text

  const handleToggle = (e) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <p className={className} style={style}>
      {displayText}
      {needsTruncation && (
        <button
          onClick={handleToggle}
          className="ml-1 hover:underline"
          style={{ color: colors.accent }}
        >
          {isExpanded ? 'ver menos' : 'ver más'}
        </button>
      )}
    </p>
  )
}

export default TruncatedText
