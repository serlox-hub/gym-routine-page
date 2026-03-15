import { useState } from 'react'
import { Text, View } from 'react-native'

const MAX_CHARS = 80

export default function TruncatedText({ text, maxChars = MAX_CHARS, className = '', style = {} }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!text) return null

  const needsTruncation = text.length > maxChars
  const displayText = needsTruncation && !isExpanded
    ? text.slice(0, maxChars).trim() + '...'
    : text

  return (
    <View className="flex-row flex-wrap">
      <Text className={className} style={style}>
        {displayText}
        {needsTruncation && (
          <Text
            onPress={() => setIsExpanded(!isExpanded)}
            className="text-accent"
          >
            {' '}{isExpanded ? 'ver menos' : 'ver más'}
          </Text>
        )}
      </Text>
    </View>
  )
}
